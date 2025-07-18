import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { parseNaturalLanguageQuery } from '@/lib/openai';
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

    const { query } = await request.json();

    // Input validation
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query text is required' },
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query too long. Please limit to 500 characters.' },
        { status: 400 }
      );
    }

    console.log(`Parsing query: "${query}"`);

    // Parse the natural language query
    const result = await parseNaturalLanguageQuery(query);

    console.log('Parsed result:', result);

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Parse query API error:', error);
    
    // Return a more specific error message if possible
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error' },
          { status: 503 }
        );
      }
      if (error.message.includes('quota') || error.message.includes('rate')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable. Please try again later.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to parse query. Please try again.' },
      { status: 500 }
    );
  }
} 