import OpenAI from 'openai';
import type { SearchParams } from '@/components/SearchForm';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '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',
});

export interface ParsedQuery {
  searchParams: SearchParams;
  confidence: number;
  reasoning: string;
}

const INDUSTRY_OPTIONS = [
  'restaurant', 'retail', 'healthcare', 'automotive', 'real estate', 
  'technology', 'construction', 'manufacturing', 'finance', 'education',
  'hospitality', 'fitness', 'beauty', 'legal', 'consulting'
];

const COMPANY_TYPE_OPTIONS = [
  'small business', 'startup', 'corporation', 'franchise', 'chain',
  'local business', 'enterprise', 'nonprofit'
];

const FACILITY_TYPE_OPTIONS = [
  'office', 'storefront', 'warehouse', 'factory', 'clinic', 'shop',
  'center', 'plaza', 'mall', 'complex'
];

export async function parseNaturalLanguageQuery(query: string): Promise<ParsedQuery> {
  if (!query.trim()) {
    return {
      searchParams: { location: '', industry: '', companyType: '', facilityType: '', keywords: '' },
      confidence: 0,
      reasoning: 'Empty query provided'
    };
  }

  try {
    const prompt = `You are an expert at parsing business search queries. Extract structured search parameters from the natural language query.

Available options:
- Industries: ${INDUSTRY_OPTIONS.join(', ')}
- Company Types: ${COMPANY_TYPE_OPTIONS.join(', ')}
- Facility Types: ${FACILITY_TYPE_OPTIONS.join(', ')}

Rules:
1. Extract location (city, state, country, region)
2. Map industry keywords to the closest available industry option
3. Identify company size/type keywords (small, startup, large, etc.)
4. Identify facility type keywords (office, store, warehouse, etc.)
5. Extract remaining relevant keywords
6. Return confidence score (0-100) based on how clear the query was
7. Provide reasoning for your choices

Query: "${query}"

Respond with JSON only:
{
  "location": "extracted location",
  "industry": "exact match from available industries or empty string",
  "companyType": "exact match from available company types or empty string", 
  "facilityType": "exact match from available facility types or empty string",
  "keywords": "remaining relevant keywords",
  "confidence": number,
  "reasoning": "brief explanation of extraction choices"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a precise query parser. Always respond with valid JSON only, no additional text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const parsed = JSON.parse(content);
    
    // Validate the response structure
    const searchParams: SearchParams = {
      location: parsed.location || '',
      industry: INDUSTRY_OPTIONS.includes(parsed.industry) ? parsed.industry : '',
      companyType: COMPANY_TYPE_OPTIONS.includes(parsed.companyType) ? parsed.companyType : '',
      facilityType: FACILITY_TYPE_OPTIONS.includes(parsed.facilityType) ? parsed.facilityType : '',
      keywords: parsed.keywords || ''
    };

    return {
      searchParams,
      confidence: Math.max(0, Math.min(100, parsed.confidence || 0)),
      reasoning: parsed.reasoning || 'Query parsed successfully'
    };

  } catch (error) {
    console.error('OpenAI parsing error:', error);
    
    // Fallback: simple keyword extraction
    const lowerQuery = query.toLowerCase();
    const fallbackParams: SearchParams = {
      location: '',
      industry: '',
      companyType: '',
      facilityType: '',
      keywords: query
    };

    // Try to extract location patterns
    const locationPatterns = [
      /\bin\s+([a-zA-Z\s,]+?)(?:\s|$)/,
      /([a-zA-Z\s,]+?),\s*[A-Z]{2}/,
      /([a-zA-Z\s]+?)\s+area/,
    ];
    
    for (const pattern of locationPatterns) {
      const match = query.match(pattern);
      if (match) {
        fallbackParams.location = match[1].trim();
        break;
      }
    }

    // Try to find industry matches
    for (const industry of INDUSTRY_OPTIONS) {
      if (lowerQuery.includes(industry)) {
        fallbackParams.industry = industry;
        break;
      }
    }

    // Try to find company type matches
    for (const companyType of COMPANY_TYPE_OPTIONS) {
      if (lowerQuery.includes(companyType)) {
        fallbackParams.companyType = companyType;
        break;
      }
    }

    // Try to find facility type matches
    for (const facilityType of FACILITY_TYPE_OPTIONS) {
      if (lowerQuery.includes(facilityType)) {
        fallbackParams.facilityType = facilityType;
        break;
      }
    }

    return {
      searchParams: fallbackParams,
      confidence: 30,
      reasoning: 'Fallback parsing used due to AI service error'
    };
  }
} 