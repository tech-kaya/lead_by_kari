import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = getUserFromRequest(request);
    console.log('Contact API - User from request:', user);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { email, place_ids } = await request.json();
    console.log('Contact API - Received payload:', { email, place_ids });

    // Input validation
    if (!place_ids || !Array.isArray(place_ids) || place_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one company must be selected' },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('Contact API - Using email from payload:', email);

    // Get company details for the selected place_ids
    const placeholders = place_ids.map((_, index) => `$${index + 1}`).join(',');
    const companiesResult = await pool.query(
      `SELECT place_id, name, email, phone, website FROM places WHERE place_id IN (${placeholders})`,
      place_ids
    );

    const companies = companiesResult.rows;

    if (companies.length === 0) {
      return NextResponse.json(
        { error: 'No companies found for the selected IDs' },
        { status: 404 }
      );
    }

    // Store contact requests in database
    const contactRequests = [];
    for (const company of companies) {
      try {
        const result = await pool.query(
          `INSERT INTO contact_requests (user_id, user_email, place_id, company_name, company_email, company_phone, company_website, status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW())
           RETURNING *`,
          [
            user.userId,
            email,
            company.place_id,
            company.name,
            company.email,
            company.phone,
            company.website
          ]
        );
        contactRequests.push(result.rows[0]);
      } catch (dbError) {
        console.error('Error storing contact request:', dbError);
        // Continue with other companies even if one fails
      }
    }

    // Here you could add email sending logic, webhook calls, etc.
    // For now, we'll just store the requests in the database

    return NextResponse.json({
      message: `Contact requests sent for ${contactRequests.length} companies`,
      requests: contactRequests,
      user: {
        email: email,
        name: 'User'
      }
    });

  } catch (error) {
    console.error('Contact API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 