import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import type { Place } from '@/lib/places';

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

    // Get comprehensive data for all requested places
    const query = `
      SELECT 
        name,
        industry,
        address,
        city,
        phone,
        phone_verified,
        email,
        email_verified,
        website,
        website_status,
        contact_form_url,
        contact_form_working,
        revenue,
        revenue_exact,
        employee_count,
        employee_count_exact,
        company_type,
        year_founded,
        company_age,
        tax_id,
        registration_state,
        business_status,
        business_verified,
        category,
        enrichment_level,
        last_enriched_at,
        stored_at
      FROM places 
      WHERE place_id = ANY($1)
      ORDER BY name
    `;

    const result = await pool.query(query, [place_ids]);
    const places = result.rows;

    if (places.length === 0) {
      return NextResponse.json(
        { error: 'No places found' },
        { status: 404 }
      );
    }

    // Generate CSV content
    const csvContent = generateCSV(places);
    
    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads_export_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateCSV(places: Place[]): string {
  // CSV Headers - all the comprehensive company details
  const headers = [
    'Company Name',
    'Industry', 
    'Address',
    'City',
    'Phone',
    'Phone Verified',
    'Email',
    'Email Verified', 
    'Website',
    'Website Status',
    'Contact Form URL',
    'Contact Form Working',
    'Revenue',
    'Revenue (Exact)',
    'Employee Count',
    'Employee Count (Exact)',
    'Company Type',
    'Year Founded',
    'Company Age',
    'Tax ID (EIN)',
    'Registration State',
    'Business Status',
    'Business Verified',
    'Category',
    'Verification Level',
    'Last Enriched',
    'Date Added'
  ];

  // Convert data to CSV rows
  const rows = places.map(place => [
    escapeCSV(place.name || ''),
    escapeCSV(place.industry || ''),
    escapeCSV(place.address || ''),
    escapeCSV(place.city || ''),
    escapeCSV(place.phone || ''),
    place.phone_verified ? 'Yes' : 'No',
    escapeCSV(place.email || ''),
    place.email_verified ? 'Yes' : 'No',
    escapeCSV(place.website || ''),
    escapeCSV(place.website_status || 'Unknown'),
    escapeCSV(place.contact_form_url || ''),
    place.contact_form_working ? 'Yes' : place.contact_form_url ? 'No' : 'N/A',
    escapeCSV(place.revenue || ''),
    place.revenue_exact || '',
    escapeCSV(place.employee_count || ''),
    place.employee_count_exact || '',
    escapeCSV(place.company_type || ''),
    place.year_founded || '',
    place.company_age || '',
    escapeCSV(place.tax_id || ''),
    escapeCSV(place.registration_state || ''),
    escapeCSV(place.business_status || ''),
    place.business_verified ? 'Yes' : 'No',
    escapeCSV(place.category || ''),
    escapeCSV(place.enrichment_level || 'Basic'),
    place.last_enriched_at ? new Date(place.last_enriched_at).toLocaleDateString() : '',
    place.stored_at ? new Date(place.stored_at).toLocaleDateString() : ''
  ]);

  // Combine headers and rows
  const csvLines = [headers.join(','), ...rows.map(row => row.join(','))];
  
  return csvLines.join('\n');
}

function escapeCSV(value: string): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const stringValue = String(value);
  
  // If the value contains comma, newline, or quotes, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
} 