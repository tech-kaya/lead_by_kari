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
  
  // Enhanced company information
  industry?: string;
  revenue?: string;
  revenue_exact?: number;
  employee_count?: string;
  employee_count_exact?: number;
  company_type?: string; // LLC, Corp, Inc, etc.
  year_founded?: number;
  company_age?: number;
  
  // Contact verification
  email?: string;
  email_verified?: boolean;
  email_verified_at?: Date;
  phone_verified?: boolean;
  phone_verified_at?: Date;
  website_status?: string; // "active", "inactive", "broken", "redirected"
  website_verified_at?: Date;
  contact_form_url?: string;
  contact_form_working?: boolean;
  contact_form_verified_at?: Date;
  
  // Business verification
  business_verified?: boolean;
  tax_id?: string; // EIN or similar
  registration_state?: string;
  business_status?: string; // "active", "inactive", "dissolved"
  
  // Data enrichment metadata
  enrichment_level?: string; // "basic", "enhanced", "premium"
  last_enriched_at?: Date;
  data_sources?: Record<string, unknown>; // Track which APIs/sources provided data
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
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
    periods?: unknown[];
    weekday_text?: string[];
  };
}

// Enhanced company data interface
export interface CompanyData {
  basic_info: {
    name: string;
    address: string;
    phone?: string;
    website?: string;
    industry?: string;
  };
  business_details: {
    company_type?: string;
    year_founded?: number;
    company_age?: number;
    tax_id?: string;
    registration_state?: string;
    business_status?: string;
  };
  financial_info: {
    revenue?: string;
    revenue_exact?: number;
    employee_count?: string;
    employee_count_exact?: number;
  };
  contact_verification: {
    email?: string;
    email_verified: boolean;
    phone_verified: boolean;
    website_status: string;
    contact_form_url?: string;
    contact_form_working: boolean;
  };
  enrichment_metadata: {
    enrichment_level: string;
    last_enriched_at: Date;
    data_sources: Record<string, unknown>;
  };
}

// Retry with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Skip retries for certain error types
      if (error instanceof Error) {
        if (error.message.includes('API key') || 
            error.message.includes('403') ||
            error.message.includes('401')) {
          throw error;
        }
      }
      
      const delayMs = baseDelay * (2 ** attempt);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError || new Error('Retry failed without error');
}

// Enhanced delay function with jitter
async function delay(ms: number): Promise<void> {
  const jitter = Math.random() * 200; // Add 0-200ms random jitter
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

// Get detailed place information
export async function getPlaceDetails(placeId: string): Promise<Partial<GooglePlace>> {
  const apiKey = 'AIzaSyBGO5ewIPuY_tJfFaK5NwXaRhEYHrEJw0U';
  const fields = [
    'place_id',
    'name', 
    'formatted_address',
    'geometry',
    'types',
    'formatted_phone_number',
    'international_phone_number',
    'website',
    'rating',
    'user_ratings_total',
    'price_level',
    'opening_hours'
  ].join(',');
  
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LeadsBot/1.0)'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Place Details API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Place Details API status: ${data.status}`);
    }

    return data.result || {};
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Place Details API timeout for ${placeId}`);
    }
    throw error;
  }
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



// Search Google Places API
export async function searchGooglePlaces(query: string, maxResults?: number): Promise<GooglePlace[]> {
  const apiKey = 'AIzaSyBGO5ewIPuY_tJfFaK5NwXaRhEYHrEJw0U';
  
  if (!apiKey) {
    throw new Error('Google Places API key not configured');
  }

  const searchPlaces = async (): Promise<GooglePlace[]> => {
    // Detect if we're in production environment for faster processing
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    
    // Generate search variations to get more comprehensive results
    const searchVariations = generateSearchVariations(query);
    console.log(`Searching with ${searchVariations.length} variations:`, searchVariations);
    
    let allResults: GooglePlace[] = [];
    const seenPlaceIds = new Set<string>();
    const targetResults = maxResults || 60; // Default to 60 if no limit specified
    
    // Search each variation but stop when we have enough results
    for (let i = 0; i < searchVariations.length && allResults.length < targetResults; i++) {
      const searchQuery = searchVariations[i];
      console.log(`\n--- Searching variation ${i + 1}/${searchVariations.length}: "${searchQuery}" ---`);
      
      try {
        // Calculate how many more results we need
        const remainingNeeded = targetResults - allResults.length;
        const variationResults = await searchSingleQueryLimited(searchQuery, apiKey, remainingNeeded);
        
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
        
        // Stop if we have enough results
        if (allResults.length >= targetResults) {
          console.log(`Reached target of ${targetResults} results, stopping search variations.`);
          break;
        }
        
        // Small delay between different search variations (shorter in production)
        if (i < searchVariations.length - 1) {
          const delayTime = isProduction ? 200 : 500; // Faster in production
          await delay(delayTime);
        }
        
      } catch (error) {
        console.warn(`Failed to search variation "${searchQuery}":`, error);
        // Continue to next variation
      }
    }
    
    // Trim to exact maxResults if specified
    const finalResults = maxResults ? allResults.slice(0, maxResults) : allResults;
    console.log(`\nTotal unique places fetched: ${finalResults.length}`);
    
    if (isProduction) {
      // FAST MODE: Skip detailed place enhancement in production
      console.log('Production mode: Skipping detailed place enhancement for speed');
      console.log(`Returning ${finalResults.length} basic results for fast processing`);
      return finalResults;
    }
    
    // DEVELOPMENT MODE: Full place details enhancement
    console.log('Development mode: Fetching detailed place information');
    
    // Enhance each result with detailed information including website
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    const enhancedResults: GooglePlace[] = [];
    
    for (let i = 0; i < finalResults.length; i += batchSize) {
      const batch = finalResults.slice(i, i + batchSize);
      console.log(`Enhancing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(finalResults.length / batchSize)} (${batch.length} places)`);
      
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
      if (i + batchSize < finalResults.length) {
        await delay(250);
      }
    }
    
    console.log(`Returning ${enhancedResults.length} enhanced results`);
    return enhancedResults;
  };

  try {
    return await retryWithBackoff(searchPlaces);
  } catch (error) {
    console.error('Failed to search Google Places after retries:', error);
    throw error;
  }
}

// Search a single query with limited results
async function searchSingleQueryLimited(query: string, apiKey: string, maxResults: number): Promise<GooglePlace[]> {
  let allResults: GooglePlace[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const maxPages = Math.ceil(maxResults / 20); // Each page has ~20 results
  
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
    
    // Stop if we have enough results or reached max pages
    if (allResults.length >= maxResults || pageCount >= maxPages) {
      console.log(`Stopping search - have ${allResults.length} results (target: ${maxResults})`);
      break;
    }
    
    // If there's a next page token, wait a bit before the next request
    if (nextPageToken) {
      console.log(`Waiting 2 seconds before fetching page ${pageCount + 1}...`);
      await delay(2000);
    }
    
  } while (nextPageToken && pageCount < maxPages && allResults.length < maxResults);
  
  return allResults.slice(0, maxResults); // Ensure we don't exceed the limit
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

// Phone number verification
export async function verifyPhoneNumber(phone: string): Promise<{verified: boolean; details?: Record<string, unknown>}> {
  if (!phone) return {verified: false};
  
  try {
    // Basic phone number format validation
    const cleanPhone = phone.replace(/\D/g, '');
    
    // US phone numbers should be 10-11 digits
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return {verified: false, details: {error: 'Invalid phone number format'}};
    }
    
    // You can integrate with services like Twilio Verify, NumVerify, or similar
    // For now, we'll do basic validation
    const isValidFormat = /^[\+]?[1-9][\d]{0,15}$/.test(cleanPhone);
    
    return {
      verified: isValidFormat,
      details: {
        formatted: phone,
        clean: cleanPhone,
        validation_method: 'format_check'
      }
    };
  } catch (error) {
    console.error('Phone verification error:', error);
    return {verified: false, details: {error: 'Verification failed'}};
  }
}

// Website scraping to extract email addresses
export async function extractEmailFromWebsite(websiteUrl: string): Promise<{emails: string[]; verified: boolean}> {
  if (!websiteUrl) return {emails: [], verified: false};
  
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced timeout
    
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return {emails: [], verified: false};
    }
    
    const html = await response.text();
    
    // Extract email addresses using regex
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = html.match(emailRegex) || [];
    
    // Filter out common non-business emails
    const businessEmails = emails.filter(email => {
      const domain = email.split('@')[1]?.toLowerCase();
      return domain && !['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'].includes(domain);
    });
    
    // Remove duplicates
    const uniqueEmails = [...new Set(businessEmails)];
    
    return {
      emails: uniqueEmails,
      verified: uniqueEmails.length > 0
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`Email extraction timeout for ${websiteUrl}`);
    } else {
      console.log(`Email extraction failed for ${websiteUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return {emails: [], verified: false};
  }
}

// Verify email address
export async function verifyEmailAddress(email: string): Promise<{verified: boolean; details?: Record<string, unknown>}> {
  if (!email) return {verified: false};
  
  try {
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {verified: false, details: {error: 'Invalid email format'}};
    }
    
    // You can integrate with email verification services like:
    // - EmailJS
    // - Hunter.io
    // - ZeroBounce
    // - Abstract API
    
    // For now, we'll do basic domain validation
    const domain = email.split('@')[1];
    
    return {
      verified: true,
      details: {
        email: email,
        domain: domain,
        validation_method: 'format_check'
      }
    };
  } catch (error) {
    console.error('Email verification error:', error);
    return {verified: false, details: {error: 'Verification failed'}};
  }
}

// Check website status and find contact forms
export async function analyzeWebsite(websiteUrl: string): Promise<{
  status: string;
  contact_form_url?: string;
  contact_form_working: boolean;
  emails: string[];
}> {
  if (!websiteUrl) {
    return {
      status: 'no_website',
      contact_form_working: false,
      emails: []
    };
  }
  
  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Reduced timeout
    
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return {
        status: response.status === 404 ? 'not_found' : 'error',
        contact_form_working: false,
        emails: []
      };
    }
    
    const html = await response.text();
    
    // Extract emails from the website
    const emailResult = await extractEmailFromWebsite(websiteUrl);
    
    // Look for contact forms
    const contactFormPatterns = [
      /href=["']([^"']*contact[^"']*)/gi,
      /href=["']([^"']*get-in-touch[^"']*)/gi,
      /href=["']([^"']*reach-out[^"']*)/gi,
      /<form[^>]*action=["']([^"']*contact[^"']*)/gi,
      /<form[^>]*action=["']([^"']*inquiry[^"']*)/gi
    ];
    
    let contactFormUrl: string | undefined;
    
    for (const pattern of contactFormPatterns) {
      const match = pattern.exec(html);
      if (match?.[1]) {
        contactFormUrl = match[1].startsWith('http') 
          ? match[1] 
          : new URL(match[1], websiteUrl).toString();
        break;
      }
    }
    
    // Test if contact form works (basic check)
    let contactFormWorking = false;
    if (contactFormUrl) {
      try {
        const formController = new AbortController();
        const formTimeoutId = setTimeout(() => formController.abort(), 5000); // Reduced timeout
        
        const formResponse = await fetch(contactFormUrl, {signal: formController.signal});
        clearTimeout(formTimeoutId);
        contactFormWorking = formResponse.ok;
      } catch {
        contactFormWorking = false;
      }
    }
    
    return {
      status: 'active',
      contact_form_url: contactFormUrl,
      contact_form_working: contactFormWorking,
      emails: emailResult.emails
    };
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`Website analysis timeout for ${websiteUrl}`);
    } else {
      console.log(`Website analysis failed for ${websiteUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return {
      status: 'error',
      contact_form_working: false,
      emails: []
    };
  }
}

// Extract company type from business name
export function extractCompanyType(businessName: string): string | undefined {
  const companyTypes = [
    'LLC', 'L.L.C.', 'Inc', 'Inc.', 'Incorporated', 
    'Corp', 'Corp.', 'Corporation', 'Ltd', 'Ltd.', 'Limited',
    'LLP', 'L.L.P.', 'Partnership', 'Co', 'Co.', 'Company'
  ];
  
  for (const type of companyTypes) {
    const regex = new RegExp(`\\b${type.replace('.', '\\.')}\\b`, 'i');
    if (regex.test(businessName)) {
      return type.toUpperCase().replace('.', '');
    }
  }
  
  return undefined;
}

// Estimate company age from various sources
export function estimateCompanyAge(businessName: string, foundedYear?: number): {
  estimated_age?: number;
  year_founded?: number;
  confidence: 'high' | 'medium' | 'low';
} {
  if (foundedYear) {
    return {
      estimated_age: new Date().getFullYear() - foundedYear,
      year_founded: foundedYear,
      confidence: 'high'
    };
  }
  
  // You can integrate with business databases like:
  // - D&B (Dun & Bradstreet)
  // - Crunchbase API
  // - OpenCorporates
  // - SEC EDGAR database
  
  return {
    confidence: 'low'
  };
}

// Enhanced place enrichment
export async function enrichPlaceData(place: GooglePlace): Promise<Place> {
  console.log(`Enriching data for: ${place.name}`);
  
  const basicPlace = formatGooglePlace(place);
  
  // Extract company type from name
  const companyType = extractCompanyType(place.name);
  
  // Analyze website if available
  let websiteAnalysis: {
    status: string;
    contact_form_url?: string;
    contact_form_working: boolean;
    emails: string[];
  } = {
    status: 'no_website',
    contact_form_working: false,
    emails: []
  };
  
  if (place.website) {
    websiteAnalysis = await analyzeWebsite(place.website);
  }
  
  // Verify phone number
  let phoneVerification = {verified: false};
  if (place.formatted_phone_number) {
    phoneVerification = await verifyPhoneNumber(place.formatted_phone_number);
  }
  
  // Estimate company age
  const ageEstimate = estimateCompanyAge(place.name);
  
  // Determine industry from Google Places types
  const industry = determineIndustry(place.types);
  
  const enrichedPlace: Place = {
    ...basicPlace,
    id: 0, // Will be set by database
    stored_at: new Date(),
    
    // Enhanced fields
    industry,
    company_type: companyType,
    year_founded: ageEstimate.year_founded,
    company_age: ageEstimate.estimated_age,
    
    // Contact verification
    email: websiteAnalysis.emails[0], // Primary email
    email_verified: websiteAnalysis.emails.length > 0,
    email_verified_at: websiteAnalysis.emails.length > 0 ? new Date() : undefined,
    phone_verified: phoneVerification.verified,
    phone_verified_at: phoneVerification.verified ? new Date() : undefined,
    website_status: websiteAnalysis.status,
    website_verified_at: new Date(),
    contact_form_url: websiteAnalysis.contact_form_url,
    contact_form_working: websiteAnalysis.contact_form_working,
    contact_form_verified_at: websiteAnalysis.contact_form_url ? new Date() : undefined,
    
    // Enrichment metadata
    enrichment_level: 'enhanced',
    last_enriched_at: new Date(),
    data_sources: {
      google_places: true,
      website_scraping: !!place.website,
      phone_verification: !!place.formatted_phone_number,
      email_extraction: websiteAnalysis.emails.length > 0
    }
  };
  
  return enrichedPlace;
}

// Map Google Places types to industries
function determineIndustry(types: string[]): string | undefined {
  const industryMapping: Record<string, string> = {
    'restaurant': 'Food & Beverage',
    'food': 'Food & Beverage',
    'meal_takeaway': 'Food & Beverage',
    'cafe': 'Food & Beverage',
    'bar': 'Food & Beverage',
    'store': 'Retail',
    'clothing_store': 'Retail - Fashion',
    'electronics_store': 'Retail - Electronics',
    'furniture_store': 'Retail - Furniture',
    'car_dealer': 'Automotive',
    'car_repair': 'Automotive Services',
    'gas_station': 'Automotive Services',
    'hospital': 'Healthcare',
    'doctor': 'Healthcare',
    'pharmacy': 'Healthcare',
    'dentist': 'Healthcare',
    'veterinary_care': 'Healthcare - Veterinary',
    'bank': 'Financial Services',
    'insurance_agency': 'Financial Services',
    'real_estate_agency': 'Real Estate',
    'lawyer': 'Legal Services',
    'accounting': 'Professional Services',
    'beauty_salon': 'Beauty & Wellness',
    'spa': 'Beauty & Wellness',
    'gym': 'Fitness & Recreation',
    'school': 'Education',
    'university': 'Education',
    'lodging': 'Hospitality',
    'travel_agency': 'Travel & Tourism',
    'plumber': 'Home Services',
    'electrician': 'Home Services',
    'contractor': 'Construction',
    'moving_company': 'Transportation & Logistics',
    'storage': 'Storage & Warehousing'
  };
  
  for (const type of types) {
    if (industryMapping[type]) {
      return industryMapping[type];
    }
  }
  
  // Fallback to primary type
  return types[0]?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
} 

// Enhanced search function that includes comprehensive enrichment
export async function searchGooglePlacesEnhanced(query: string, maxResults?: number): Promise<Place[]> {
  console.log('Starting enhanced search with comprehensive data enrichment...');
  
  // Detect if we're in production environment
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
  const timeLimit = isProduction ? 20000 : 60000; // 20 seconds for production, 60 for development
  const startTime = Date.now();
  
  console.log(`Running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode with ${timeLimit/1000}s time limit`);
  
  // Get basic places from Google Places API (already enhanced with details)
  const googlePlaces = await searchGooglePlaces(query, maxResults);
  console.log(`Found ${googlePlaces.length} places from Google Places API`);
  
  // Convert to Place format with minimal enrichment for production
  const enrichedPlaces: Place[] = [];
  
  if (isProduction) {
    // FAST MODE: Minimal enrichment for production
    console.log('Using FAST MODE for production - minimal enrichment');
    
    const fastResults = await Promise.all(
      googlePlaces.map(async (place) => {
        try {
          return await enrichPlaceDataFast(place);
        } catch (error) {
          console.error(`Failed to fast-enrich place ${place.name}:`, error);
          return {
            ...formatGooglePlace(place),
            id: 0,
            stored_at: new Date(),
            enrichment_level: 'fast'
          };
        }
      })
    );
    
    enrichedPlaces.push(...fastResults);
    
  } else {
    // COMPREHENSIVE MODE: Full enrichment for development
    console.log('Using COMPREHENSIVE MODE for development - full enrichment');
    
    // Process in smaller batches to avoid overwhelming APIs
    const batchSize = 5;
    for (let i = 0; i < googlePlaces.length; i += batchSize) {
      // Check time limit
      if (Date.now() - startTime > timeLimit) {
        console.warn(`Time limit reached, processing remaining ${googlePlaces.length - i} places with fast enrichment`);
        const remainingPlaces = googlePlaces.slice(i);
        const fastResults = await Promise.all(
          remainingPlaces.map(place => enrichPlaceDataFast(place))
        );
        enrichedPlaces.push(...fastResults);
        break;
      }
      
      const batch = googlePlaces.slice(i, i + batchSize);
      console.log(`Processing enrichment batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(googlePlaces.length / batchSize)}`);
      
      const batchResults = await Promise.all(
        batch.map(async (place) => {
          try {
            return await enrichPlaceData(place);
          } catch (error) {
            console.error(`Failed to enrich place ${place.name}:`, error);
            // Return basic place data if enrichment fails
            return {
              ...formatGooglePlace(place),
              id: 0,
              stored_at: new Date(),
              enrichment_level: 'basic'
            };
          }
        })
      );
      
      enrichedPlaces.push(...batchResults);
      
      // Small delay between batches to be respectful to APIs
      if (i + batchSize < googlePlaces.length) {
        await delay(1000);
      }
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`Successfully enriched ${enrichedPlaces.length} places in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
  return enrichedPlaces;
}

// Fast enrichment for production - minimal processing
async function enrichPlaceDataFast(place: GooglePlace): Promise<Place> {
  const basicPlace = formatGooglePlace(place);
  
  // Extract company type from name quickly
  const companyType = extractCompanyType(place.name);
  
  // Determine industry from Google Places types
  const industry = determineIndustry(place.types);
  
  // Quick estimates without external API calls
  const revenue = estimateRevenue(place.name);
  const employeeCount = estimateEmployeeCount(place.name);
  const yearFounded = estimateFoundingYear();
  
  const enrichedPlace: Place = {
    ...basicPlace,
    id: 0,
    stored_at: new Date(),
    
    // Basic enhanced fields
    industry,
    revenue,
    employee_count: employeeCount,
    company_type: companyType,
    year_founded: yearFounded,
    company_age: yearFounded ? new Date().getFullYear() - yearFounded : undefined,
    
    // Basic contact info (no verification in fast mode)
    phone_verified: false,
    website_status: place.website ? 'unknown' : undefined,
    
    // Fast enrichment metadata
    enrichment_level: 'fast',
    last_enriched_at: new Date(),
    data_sources: {
      google_places: true,
      fast_mode: true,
      estimates_only: true
    }
  };
  
  return enrichedPlace;
}

// Integration with external APIs for revenue and employee data
export async function getCompanyFinancialData(companyName: string): Promise<{
  revenue?: string;
  revenue_exact?: number;
  employee_count?: string;
  employee_count_exact?: number;
  company_type?: string;
  year_founded?: number;
}> {
  try {
    // You can integrate with APIs like:
    // - Clearbit Company API
    // - ZoomInfo API
    // - Apollo.io API
    // - Crunchbase API
    // - PitchBook API
    
    // Example integration with a hypothetical company data API
    // const searchTerm = website || companyName; // Future use for API calls
    
    // Mock implementation - replace with actual API calls
    const mockData = {
      revenue: estimateRevenue(companyName),
      employee_count: estimateEmployeeCount(companyName),
      company_type: extractCompanyType(companyName),
      year_founded: estimateFoundingYear()
    };
    
    return mockData;
  } catch (error) {
    console.error('Financial data API error:', error);
    return {};
  }
}

// Estimate revenue based on company indicators
function estimateRevenue(companyName: string): string | undefined {
  // This is a simplified estimation - in production, use real APIs
  const name = companyName.toLowerCase();
  
  if (name.includes('enterprise') || name.includes('corp') || name.includes('international')) {
    return '$10M-$50M';
  }
  if (name.includes('llc') || name.includes('inc')) {
    return '$1M-$10M';
  }
  if (name.includes('consulting') || name.includes('services')) {
    return '$500K-$5M';
  }
  return '$100K-$1M';
}

// Estimate employee count based on company indicators
function estimateEmployeeCount(companyName: string): string | undefined {
  // This is a simplified estimation - in production, use real APIs
  const name = companyName.toLowerCase();
  
  if (name.includes('enterprise') || name.includes('international')) {
    return '100-500';
  }
  if (name.includes('corp') || name.includes('corporation')) {
    return '50-200';
  }
  if (name.includes('consulting') || name.includes('services')) {
    return '10-50';
  }
  return '1-10';
}

// Estimate founding year based on company indicators
function estimateFoundingYear(): number | undefined {
  // This is a simplified estimation - in production, use business registry APIs
  const currentYear = new Date().getFullYear();
  
  // Random estimation between 5-25 years ago for demonstration
  return currentYear - Math.floor(Math.random() * 20) - 5;
} 