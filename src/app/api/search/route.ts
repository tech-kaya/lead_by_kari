import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { searchGooglePlaces, formatGooglePlace, type Place } from '@/lib/places';
import { getUserFromRequest } from '@/lib/auth';

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

    const { query, forceFresh } = await request.json();

    // Input validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const searchQuery = query.trim();
    let places: Place[] = [];

    // First, search local database unless forceFresh is true
    if (!forceFresh) {
      const dbResult = await pool.query(
        `SELECT * FROM places 
         WHERE name ILIKE $1 OR category ILIKE $1 OR city ILIKE $1 
         ORDER BY stored_at DESC 
         LIMIT 500`,
        [`%${searchQuery}%`]
      );

      places = dbResult.rows.map(row => ({
        ...row,
        stored_at: new Date(row.stored_at)
      }));

      // If we found results in the database, return them
      if (places.length > 0) {
        console.log(`Found ${places.length} places in database for query: ${searchQuery}`);
        return NextResponse.json({ places });
      }
    }

    // If no local results OR forceFresh is true, search Google Places
    console.log(`Searching Google Places for query: ${searchQuery}`);
    
    try {
      const googlePlaces = await searchGooglePlaces(searchQuery);
      
      if (googlePlaces.length === 0) {
        return NextResponse.json({ places: [] });
      }

      // Upsert Google Places results into database
      const upsertPromises = googlePlaces.map(async (googlePlace) => {
        const formattedPlace = formatGooglePlace(googlePlace);
        
        try {
          const result = await pool.query(
            `INSERT INTO places (place_id, name, address, city, latitude, longitude, category, phone, website)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (place_id) 
             DO UPDATE SET 
               name = EXCLUDED.name,
               address = EXCLUDED.address,
               city = EXCLUDED.city,
               latitude = EXCLUDED.latitude,
               longitude = EXCLUDED.longitude,
               category = EXCLUDED.category,
               phone = EXCLUDED.phone,
               website = EXCLUDED.website,
               stored_at = NOW()
             RETURNING *`,
            [
              formattedPlace.place_id,
              formattedPlace.name,
              formattedPlace.address,
              formattedPlace.city,
              formattedPlace.latitude,
              formattedPlace.longitude,
              formattedPlace.category,
              formattedPlace.phone,
              formattedPlace.website
            ]
          );
          
          return {
            ...result.rows[0],
            stored_at: new Date(result.rows[0].stored_at)
          } as Place;
        } catch (dbError) {
          console.error('Error upserting place:', formattedPlace.place_id, dbError);
          // Return formatted place even if DB upsert fails
          return {
            id: 0, // Temporary ID for non-persisted places
            ...formattedPlace,
            stored_at: new Date()
          } as Place;
        }
      });

      // Wait for all upserts to complete
      const upsertedPlaces = await Promise.all(upsertPromises);
      
      console.log(`Upserted ${upsertedPlaces.length} places from Google Places API`);
      
      return NextResponse.json({ places: upsertedPlaces });

    } catch (googleError) {
      console.error('Google Places API error:', googleError);
      
      // If Google Places fails, try to return any cached results
      const fallbackResult = await pool.query(
        `SELECT * FROM places 
         WHERE name ILIKE $1 OR category ILIKE $1 OR city ILIKE $1 
         ORDER BY stored_at DESC 
         LIMIT 500`,
        [`%${searchQuery}%`]
      );

      const fallbackPlaces = fallbackResult.rows.map(row => ({
        ...row,
        stored_at: new Date(row.stored_at)
      }));

      if (fallbackPlaces.length > 0) {
        console.log(`Returning ${fallbackPlaces.length} cached places due to Google API error`);
        return NextResponse.json({ 
          places: fallbackPlaces,
          warning: 'Using cached results due to API unavailability'
        });
      }

      return NextResponse.json(
        { error: 'Search service temporarily unavailable' },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 