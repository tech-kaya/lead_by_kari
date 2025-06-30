export interface Place {
  id: number;
  place_id: string;
  name: string;
  address: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  phone?: string;
  website?: string;
  stored_at: Date;
}

export interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  business_status?: string;
  formatted_phone_number?: string;
  website?: string;
}

// Exponential backoff for API retries
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delayMs = baseDelay * (2 ** i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delayMs}ms delay`);
      await delay(delayMs);
    }
  }
  
  throw lastError || new Error('Unknown error occurred');
}

// Get detailed place information including website
async function getPlaceDetails(placeId: string): Promise<Partial<GooglePlace>> {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  
  const fields = [
    'place_id',
    'name',
    'formatted_address',
    'geometry',
    'types',
    'business_status',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'url',
    'rating',
    'user_ratings_total'
  ].join(',');

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Place Details API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.status !== 'OK') {
    console.warn(`Place Details API warning for ${placeId}: ${data.status}`);
    return {};
  }
  
  return data.result || {};
}

// Generate multiple search variations to get more comprehensive results
function generateSearchVariations(query: string): string[] {
  const variations = [query];
  
  // If the query is long, also try shorter versions
  if (query.length > 50) {
    const words = query.split(' ');
    if (words.length > 3) {
      // Try first half of words
      variations.push(words.slice(0, Math.ceil(words.length / 2)).join(' '));
      // Try without keywords (just location and type)
      const locationWords = words.filter(word => 
        word.toLowerCase().includes('in ') || 
        word.length > 3 && !['tech', 'ai', 'ml', 'python'].includes(word.toLowerCase())
      );
      if (locationWords.length >= 2) {
        variations.push(locationWords.join(' '));
      }
    }
  }
  
  return variations;
}

// Search a single query with pagination
async function searchSingleQuery(query: string, apiKey: string): Promise<GooglePlace[]> {
  let allResults: GooglePlace[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const maxPages = 3; // Google Places allows up to 3 pages (60 results total)
  
  do {
    // Build URL with pagination token if available
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}&type=establishment`;
    if (nextPageToken) {
      url += `&pagetoken=${nextPageToken}`;
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      if (data.status === 'INVALID_REQUEST' && nextPageToken) {
        // Sometimes the next page token is not ready yet, wait and retry
        console.log('Waiting for next page token to be ready...');
        await delay(2000);
        continue;
      }
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }
    
    const pageResults = data.results || [];
    allResults = allResults.concat(pageResults);
    
    nextPageToken = data.next_page_token;
    pageCount++;
    
    console.log(`Query "${query}" - Page ${pageCount}: ${pageResults.length} results. Total: ${allResults.length}`);
    console.log(`Next page token: ${nextPageToken ? 'Available' : 'None'}`);
    
    // If there's a next page token, wait a bit before the next request
    // Google requires a short delay before using the next page token
    if (nextPageToken && pageCount < maxPages) {
      console.log(`Waiting 2 seconds before fetching page ${pageCount + 1}...`);
      await delay(2000);
    }
    
  } while (nextPageToken && pageCount < maxPages);
  
  return allResults;
}

// Search Google Places API
export async function searchGooglePlaces(query: string): Promise<GooglePlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_KEY;
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const searchPlaces = async (): Promise<GooglePlace[]> => {
    // Generate search variations to get more comprehensive results
    const searchVariations = generateSearchVariations(query);
    console.log(`Searching with ${searchVariations.length} variations:`, searchVariations);
    
    let allResults: GooglePlace[] = [];
    const seenPlaceIds = new Set<string>();
    
    // Search each variation
    for (let i = 0; i < searchVariations.length; i++) {
      const searchQuery = searchVariations[i];
      console.log(`\n--- Searching variation ${i + 1}/${searchVariations.length}: "${searchQuery}" ---`);
      
      try {
        const variationResults = await searchSingleQuery(searchQuery, apiKey);
        
        // Filter out duplicates based on place_id
        const newResults = variationResults.filter(place => {
          if (seenPlaceIds.has(place.place_id)) {
            return false;
          }
          seenPlaceIds.add(place.place_id);
          return true;
        });
        
        allResults = allResults.concat(newResults);
        console.log(`Added ${newResults.length} new unique results. Total unique: ${allResults.length}`);
        
        // Small delay between different search variations
        if (i < searchVariations.length - 1) {
          await delay(1000);
        }
        
             } catch (error) {
         console.warn(`Failed to search variation "${searchQuery}":`, error);
         // Continue to next variation
       }
    }
    
    console.log(`\nTotal unique places fetched from all variations: ${allResults.length}`);
    
    // Enhance each result with detailed information including website
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    const enhancedResults: GooglePlace[] = [];
    
    for (let i = 0; i < allResults.length; i += batchSize) {
      const batch = allResults.slice(i, i + batchSize);
      console.log(`Enhancing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allResults.length / batchSize)} (${batch.length} places)`);
      
      const batchResults = await Promise.all(
        batch.map(async (place: GooglePlace) => {
          try {
            const details = await getPlaceDetails(place.place_id);
            return {
              ...place,
              ...details,
              // Ensure we have the website from details
              website: details.website || place.website,
              formatted_phone_number: details.formatted_phone_number || place.formatted_phone_number
            };
          } catch (error) {
            console.warn(`Failed to get details for place ${place.place_id}:`, error);
            return place; // Return basic place info if details fail
          }
        })
      );
      
      enhancedResults.push(...batchResults);
      
      // Small delay between batches to be respectful to the API
      if (i + batchSize < allResults.length) {
        await delay(500);
      }
    }
    
    return enhancedResults;
  };

  try {
    return await retryWithBackoff(searchPlaces);
  } catch (error) {
    console.error('Failed to search Google Places after retries:', error);
    throw error;
  }
}

// Convert Google Place to our Place format
export function formatGooglePlace(googlePlace: GooglePlace): Omit<Place, 'id' | 'stored_at'> {
  // Extract city from formatted address (rough heuristic)
  const addressParts = googlePlace.formatted_address.split(', ');
  const city = addressParts.length > 1 ? addressParts[addressParts.length - 2] : '';
  
  // Get primary category from types
  const category = googlePlace.types.find(type => 
    !['establishment', 'point_of_interest', 'geocode'].includes(type)
  ) || googlePlace.types[0] || '';

  return {
    place_id: googlePlace.place_id,
    name: googlePlace.name,
    address: googlePlace.formatted_address,
    city: city,
    latitude: googlePlace.geometry.location.lat,
    longitude: googlePlace.geometry.location.lng,
    category: category.replace(/_/g, ' '), // Convert snake_case to readable format
    phone: googlePlace.formatted_phone_number || undefined,
    website: googlePlace.website || undefined
  };
} 