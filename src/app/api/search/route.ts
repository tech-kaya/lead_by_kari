import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { searchGooglePlacesEnhanced } from '@/lib/places';

export async function POST(request: NextRequest) {
  try {
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { query, company, industry, facility, forceRefresh, maxResults } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    let searchQuery = query;

    // For now, we'll use manual filters instead of OpenAI parsing
    // You can add OpenAI integration later if needed
    
    // Build the final search query with filters
    if (company || industry || facility) {
      const parts = [searchQuery];
      
      if (company) {
        parts.push(company);
      }
      if (industry) {
        parts.push(industry);
      }
      if (facility) {
        parts.push(facility);
      }
      
      searchQuery = parts.join(' ');
    }

    console.log('Final search query:', searchQuery);

    // Check if we should force a fresh fetch or use cached results
    if (!forceRefresh) {
      // Try to get cached results first
      const cachedQuery = `
        SELECT * FROM places 
        WHERE 
          LOWER(name) LIKE LOWER($1) OR 
          LOWER(address) LIKE LOWER($1) OR 
          LOWER(category) LIKE LOWER($1) OR
          LOWER(industry) LIKE LOWER($1)
        ORDER BY stored_at DESC 
        LIMIT 60
      `;
      
      const cachedResult = await pool.query(cachedQuery, [`%${searchQuery}%`]);
      
      if (cachedResult.rows.length > 0) {
        console.log(`Found ${cachedResult.rows.length} cached results`);
        return NextResponse.json({
          places: cachedResult.rows,
          fromCache: true,
          totalResults: cachedResult.rows.length,
          aiParsed: false // No OpenAI parsing
        });
      }
    }

    // Fetch fresh results with comprehensive enrichment
    console.log('Fetching fresh results with comprehensive data...');
    const enrichedPlaces = await searchGooglePlacesEnhanced(searchQuery, maxResults);

    if (enrichedPlaces.length === 0) {
      return NextResponse.json({
        places: [],
        fromCache: false,
        totalResults: 0,
        aiParsed: false // No OpenAI parsing
      });
    }

    // Store results in database with comprehensive data
    const insertQuery = `
      INSERT INTO places (
        place_id, name, address, city, latitude, longitude, category, phone, website,
        industry, revenue, revenue_exact, employee_count, employee_count_exact, 
        company_type, year_founded, company_age, email, email_verified, email_verified_at,
        phone_verified, phone_verified_at, website_status, website_verified_at,
        contact_form_url, contact_form_working, contact_form_verified_at,
        business_verified, tax_id, registration_state, business_status,
        enrichment_level, last_enriched_at, data_sources
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
      ) ON CONFLICT (place_id) 
      DO UPDATE SET 
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        category = EXCLUDED.category,
        phone = EXCLUDED.phone,
        website = EXCLUDED.website,
        industry = EXCLUDED.industry,
        revenue = EXCLUDED.revenue,
        revenue_exact = EXCLUDED.revenue_exact,
        employee_count = EXCLUDED.employee_count,
        employee_count_exact = EXCLUDED.employee_count_exact,
        company_type = EXCLUDED.company_type,
        year_founded = EXCLUDED.year_founded,
        company_age = EXCLUDED.company_age,
        email = EXCLUDED.email,
        email_verified = EXCLUDED.email_verified,
        email_verified_at = EXCLUDED.email_verified_at,
        phone_verified = EXCLUDED.phone_verified,
        phone_verified_at = EXCLUDED.phone_verified_at,
        website_status = EXCLUDED.website_status,
        website_verified_at = EXCLUDED.website_verified_at,
        contact_form_url = EXCLUDED.contact_form_url,
        contact_form_working = EXCLUDED.contact_form_working,
        contact_form_verified_at = EXCLUDED.contact_form_verified_at,
        business_verified = EXCLUDED.business_verified,
        tax_id = EXCLUDED.tax_id,
        registration_state = EXCLUDED.registration_state,
        business_status = EXCLUDED.business_status,
        enrichment_level = EXCLUDED.enrichment_level,
        last_enriched_at = EXCLUDED.last_enriched_at,
        data_sources = EXCLUDED.data_sources,
        updated_at = NOW()
      RETURNING id
    `;

    const savedPlaces = [];
    
    for (const place of enrichedPlaces) {
      try {
        const result = await pool.query(insertQuery, [
          place.place_id, place.name, place.address, place.city, 
          place.latitude, place.longitude, place.category, place.phone, place.website,
          place.industry, place.revenue, place.revenue_exact, place.employee_count, place.employee_count_exact,
          place.company_type, place.year_founded, place.company_age, place.email, place.email_verified, place.email_verified_at,
          place.phone_verified, place.phone_verified_at, place.website_status, place.website_verified_at,
          place.contact_form_url, place.contact_form_working, place.contact_form_verified_at,
          place.business_verified, place.tax_id, place.registration_state, place.business_status,
          place.enrichment_level, place.last_enriched_at, JSON.stringify(place.data_sources)
        ]);
        
        savedPlaces.push({
          ...place,
          id: result.rows[0].id
        });
      } catch (error) {
        console.error('Error saving place:', error);
        // Continue with other places even if one fails
        savedPlaces.push(place);
      }
    }

    console.log(`Successfully saved ${savedPlaces.length} enriched places to database`);

            return NextResponse.json({
          places: savedPlaces,
          fromCache: false,
          totalResults: savedPlaces.length,
          aiParsed: false, // No OpenAI parsing
          enrichmentLevel: 'comprehensive'
        });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search places' },
      { status: 500 }
    );
  }
} 