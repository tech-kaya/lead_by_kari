import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { searchGooglePlacesEnhanced } from '@/lib/places';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const requestBody = await request.json();
    const { searchParams, query, forceFresh = false, maxResults = 20 } = requestBody;

    // Handle both new format (searchParams) and old format (query)
    let searchQuery: string;
    
    if (searchParams) {
      // New format from SearchForm
      searchQuery = [
        searchParams.industry,
        searchParams.companyType,
        searchParams.keywords,
        'in',
        searchParams.location
      ].filter(Boolean).join(' ');
    } else if (query) {
      // Old format from dashboard
      searchQuery = query;
    } else {
      return NextResponse.json(
        { error: 'Search query or parameters are required' },
        { status: 400 }
      );
    }

    console.log('Final search query:', searchQuery);

    let places = [];

    // Only check cache if not forcing fresh data and we have a reasonable query
    if (!forceFresh && searchQuery.length > 10) {
      try {
        console.log('Checking for cached results...');
        
        // Use connection pool with timeout
        const client = await pool.connect();
        try {
          const cachedQuery = `
            SELECT * FROM places 
            WHERE LOWER(CONCAT(name, ' ', COALESCE(address, ''), ' ', COALESCE(category, ''))) 
            ILIKE $1 
            AND stored_at > NOW() - INTERVAL '24 hours'
            ORDER BY stored_at DESC 
            LIMIT $2
          `;
          
          const cachedResult = await client.query(cachedQuery, [`%${searchQuery.toLowerCase()}%`, maxResults]);
          
          if (cachedResult.rows.length > 0) {
            console.log(`Found ${cachedResult.rows.length} cached results`);
            places = cachedResult.rows;
          }
        } finally {
          client.release(); // Always release the connection
        }
      } catch (dbError) {
        console.warn('Database cache check failed, falling back to fresh search:', dbError);
        // Continue to fresh search if cache fails
      }
    } else {
      console.log('Fetching fresh results with comprehensive data...');
    }

    // If no cached results or forcing fresh, search Google Places
    if (places.length === 0) {
      console.log('No cached results found, searching Google Places...');
      
      try {
        const enrichedPlaces = await searchGooglePlacesEnhanced(searchQuery, maxResults);
        
        if (enrichedPlaces.length > 0) {
          // Store in database with better error handling
          try {
            console.log('Connected to PostgreSQL database');
            
            const client = await pool.connect();
            try {
              for (const place of enrichedPlaces) {
                const insertQuery = `
                  INSERT INTO places (
                    place_id, name, address, city, latitude, longitude, category, phone, website,
                    industry, revenue, revenue_exact, employee_count, employee_count_exact,
                    company_type, year_founded, company_age, email, email_verified, email_verified_at,
                    phone_verified, phone_verified_at, website_status, website_verified_at,
                    contact_form_url, contact_form_working, contact_form_verified_at,
                    business_verified, tax_id, registration_state, business_status,
                    enrichment_level, last_enriched_at, data_sources, stored_at
                  ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                    $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, NOW()
                  )
                  ON CONFLICT (place_id) DO UPDATE SET
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
                    stored_at = NOW()
                `;

                await client.query(insertQuery, [
                  place.place_id, place.name, place.address, place.city, place.latitude, place.longitude,
                  place.category, place.phone, place.website, place.industry, place.revenue, place.revenue_exact,
                  place.employee_count, place.employee_count_exact, place.company_type, place.year_founded,
                  place.company_age, place.email, place.email_verified, place.email_verified_at,
                  place.phone_verified, place.phone_verified_at, place.website_status, place.website_verified_at,
                  place.contact_form_url, place.contact_form_working, place.contact_form_verified_at,
                  place.business_verified, place.tax_id, place.registration_state, place.business_status,
                  place.enrichment_level, place.last_enriched_at, 
                  typeof place.data_sources === 'string' ? place.data_sources : JSON.stringify(place.data_sources)
                ]);
              }
              
              console.log(`Successfully saved ${enrichedPlaces.length} enriched places to database`);
            } finally {
              client.release();
            }
          } catch (dbError) {
            console.error('Failed to save to database:', dbError);
            // Continue with results even if database save fails
          }
        }
        
        places = enrichedPlaces;
      } catch (searchError) {
        console.error('Google Places search failed:', searchError);
        return NextResponse.json(
          { error: 'Search failed. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      places: places.slice(0, maxResults),
      totalFound: places.length,
      searchQuery,
      cached: !forceFresh && places.length > 0
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 