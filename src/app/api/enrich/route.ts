import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/* eslint-disable @typescript-eslint/no-explicit-any */

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

    const { place_ids } = await request.json();

    if (!place_ids || !Array.isArray(place_ids) || place_ids.length === 0) {
      return NextResponse.json(
        { error: 'Place IDs array is required' },
        { status: 400 }
      );
    }

    console.log(`Starting enrichment for ${place_ids.length} places`);
    
    const enrichmentResults: unknown[] = [];

    // Process places in batches to avoid overwhelming external APIs
    const batchSize = 5;
    for (let i = 0; i < place_ids.length; i += batchSize) {
      const batch = place_ids.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (placeId: string) => {
        try {
          // Get place from database
          const placeResult = await pool.query('SELECT * FROM places WHERE place_id = $1', [placeId]);
          if (placeResult.rows.length === 0) {
            return { place_id: placeId, error: 'Place not found' };
          }

          const place = placeResult.rows[0];
          
          // Perform comprehensive enrichment
          const enrichedData = await enrichPlace(place);
          
          // Update place in database
          await updatePlaceWithEnrichment(placeId, enrichedData);
          
          return { place_id: placeId, status: 'enriched', data: enrichedData };
        } catch (error) {
          console.error(`Error enriching place ${placeId}:`, error);
          return { place_id: placeId, error: 'Enrichment failed' };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          enrichmentResults.push(result.value);
        } else {
          enrichmentResults.push({ 
            place_id: batch[index], 
            error: 'Processing failed' 
          });
        }
      });

      // Small delay between batches
      if (i + batchSize < place_ids.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({ 
      results: enrichmentResults,
      summary: {
        total: place_ids.length,
        enriched: enrichmentResults.filter((r: unknown) => (r as { status?: string }).status === 'enriched').length,
        failed: enrichmentResults.filter((r: unknown) => (r as { error?: string }).error).length
      }
    });

  } catch (error) {
    console.error('Enrichment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface PlaceRow {
  place_id: string;
  name: string;
  website?: string;
  phone?: string;
  [key: string]: unknown;
}

// Comprehensive place enrichment function  
async function enrichPlace(place: PlaceRow): Promise<Record<string, any>> {
  const enrichedData: Record<string, any> = {};
  
  try {
    // Extract domain from website
    let domain = '';
    if (place.website && typeof place.website === 'string') {
      try {
        const url = new URL(place.website.startsWith('http') ? place.website : `https://${place.website}`);
        domain = url.hostname.replace('www.', '');
      } catch {
        domain = place.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      }
    }

    // Enrich with The Companies API
    if (domain && process.env.COMPANIES_API_KEY) {
      try {
        const response = await fetch(`https://api.thecompaniesapi.com/v1/companies/${domain}`, {
          headers: {
            'Authorization': `Bearer ${process.env.COMPANIES_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          enrichedData.industry = data.about?.industry || data.about?.industries?.[0];
          enrichedData.revenue = data.finances?.revenue;
          enrichedData.employee_count = data.about?.totalEmployees;
          enrichedData.employee_count_exact = data.about?.totalEmployeesExact;
          enrichedData.company_type = data.about?.businessType;
          enrichedData.year_founded = data.about?.yearFounded;
          
          if (data.about?.yearFounded) {
            enrichedData.company_age = new Date().getFullYear() - data.about.yearFounded;
          }
          
          // Extract email pattern
          if (data.secondaries?.emailPatterns?.[0] && typeof data.secondaries.emailPatterns[0] === 'string') {
            enrichedData.email = data.secondaries.emailPatterns[0]
              .replace('{first}', 'info')
              .replace('{last}', '');
          }
        }
      } catch (error) {
        console.warn('Companies API error:', error);
      }
    }

    // Verify phone number
    if (place.phone && typeof place.phone === 'string') {
      const cleaned = place.phone.replace(/\D/g, '');
      const isValid = (cleaned.length === 10 && cleaned[0] !== '0' && cleaned[0] !== '1') ||
                     (cleaned.length >= 7 && cleaned.length <= 15);
      enrichedData.phone_verified = isValid;
      enrichedData.phone_verified_at = new Date();
    }

    // Verify email
    if (enrichedData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      enrichedData.email_verified = emailRegex.test(enrichedData.email);
      enrichedData.email_verified_at = new Date();
    }

    // Verify website and extract additional info
    if (place.website && typeof place.website === 'string') {
      try {
        const websiteUrl = place.website.startsWith('http') ? place.website : `https://${place.website}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(websiteUrl, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          enrichedData.website_status = response.url !== websiteUrl ? 'redirected' : 'active';
        } else {
          enrichedData.website_status = 'inactive';
        }
        enrichedData.website_verified_at = new Date();

        // Try to extract email from website
        if (!enrichedData.email && typeof websiteUrl === 'string') {
          try {
            const htmlController = new AbortController();
            const htmlTimeoutId = setTimeout(() => htmlController.abort(), 15000);
            
            const htmlResponse = await fetch(websiteUrl, {
              signal: htmlController.signal
            });
            
            clearTimeout(htmlTimeoutId);
            
            if (htmlResponse.ok) {
              const html = await htmlResponse.text();
              const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
              const emails = html.match(emailRegex);
              
              if (emails) {
                const businessEmails = emails.filter(email => 
                  !email.includes('noreply') && 
                  !email.includes('no-reply') &&
                  !email.includes('example') &&
                  (email.includes('info') || email.includes('contact') || email.includes('hello') || email.includes('support'))
                );
                
                if (businessEmails.length > 0) {
                  enrichedData.email = businessEmails[0];
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  enrichedData.email_verified = emailRegex.test(enrichedData.email);
                  enrichedData.email_verified_at = new Date();
                }
              }

              // Look for contact form
              const contactRegex = /(href=["']([^"']*(?:contact|get-in-touch|reach-out)[^"']*))["']/gi;
              const contactMatches = html.match(contactRegex);
              
              if (contactMatches) {
                const contactUrl = contactMatches[0].match(/href=["']([^"']*)/)?.[1];
                if (contactUrl && typeof contactUrl === 'string' && typeof websiteUrl === 'string') {
                  enrichedData.contact_form_url = contactUrl.startsWith('http') ? 
                    contactUrl : 
                    new URL(contactUrl, websiteUrl).href;
                  
                  // Test if contact form works
                  try {
                    const contactController = new AbortController();
                    const contactTimeoutId = setTimeout(() => contactController.abort(), 10000);
                    const contactResponse = await fetch(enrichedData.contact_form_url, { 
                      method: 'HEAD', 
                      signal: contactController.signal 
                    });
                    clearTimeout(contactTimeoutId);
                    enrichedData.contact_form_working = contactResponse.ok;
                  } catch {
                    enrichedData.contact_form_working = false;
                  }
                  enrichedData.contact_form_verified_at = new Date();
                }
              }
            }
          } catch (error) {
            console.warn('Website content extraction error:', error);
          }
        }
      } catch (error) {
        enrichedData.website_status = 'broken';
        enrichedData.website_verified_at = new Date();
        console.warn('Website verification error:', error);
      }
    }

    // Set enrichment metadata
    enrichedData.enrichment_level = 'enhanced';
    enrichedData.last_enriched_at = new Date();
    enrichedData.data_sources = JSON.stringify({
      companies_api: !!enrichedData.industry,
      phone_verification: !!enrichedData.phone_verified,
      email_verification: !!enrichedData.email_verified,
      website_verification: !!enrichedData.website_status,
      contact_form_detection: !!enrichedData.contact_form_url
    });

    return enrichedData;
  } catch (error) {
    console.error('Place enrichment error:', error);
    return {
      enrichment_level: 'basic',
      last_enriched_at: new Date(),
      data_sources: JSON.stringify({ error: 'Enrichment failed' })
    };
  }
}

// Update place with enriched data
async function updatePlaceWithEnrichment(placeId: string, enrichedData: Record<string, any>) {
  const updateQuery = `
    UPDATE places SET
      industry = COALESCE($2, industry),
      revenue = COALESCE($3, revenue),
      employee_count = COALESCE($4, employee_count),
      employee_count_exact = COALESCE($5, employee_count_exact),
      company_type = COALESCE($6, company_type),
      year_founded = COALESCE($7, year_founded),
      company_age = COALESCE($8, company_age),
      email = COALESCE($9, email),
      email_verified = COALESCE($10, email_verified),
      email_verified_at = COALESCE($11, email_verified_at),
      phone_verified = COALESCE($12, phone_verified),
      phone_verified_at = COALESCE($13, phone_verified_at),
      website_status = COALESCE($14, website_status),
      website_verified_at = COALESCE($15, website_verified_at),
      contact_form_url = COALESCE($16, contact_form_url),
      contact_form_working = COALESCE($17, contact_form_working),
      contact_form_verified_at = COALESCE($18, contact_form_verified_at),
      enrichment_level = COALESCE($19, enrichment_level),
      last_enriched_at = COALESCE($20, last_enriched_at),
      data_sources = COALESCE($21, data_sources),
      updated_at = NOW()
    WHERE place_id = $1
  `;
  
  await pool.query(updateQuery, [
    placeId,
    enrichedData.industry,
    enrichedData.revenue,
    enrichedData.employee_count,
    enrichedData.employee_count_exact,
    enrichedData.company_type,
    enrichedData.year_founded,
    enrichedData.company_age,
    enrichedData.email,
    enrichedData.email_verified,
    enrichedData.email_verified_at,
    enrichedData.phone_verified,
    enrichedData.phone_verified_at,
    enrichedData.website_status,
    enrichedData.website_verified_at,
    enrichedData.contact_form_url,
    enrichedData.contact_form_working,
    enrichedData.contact_form_verified_at,
    enrichedData.enrichment_level,
    enrichedData.last_enriched_at,
    enrichedData.data_sources
  ]);
} 