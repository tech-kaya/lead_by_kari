import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Place } from './places';

export interface ComprehensiveExportData {
  // Basic Company Information
  'Company Name': string;
  'Industry': string;
  'Address': string;
  'City': string;
  'Category': string;
  
  // Contact Information
  'Phone': string;
  'Phone Verified': string;
  'Email': string;
  'Email Verified': string;
  'Website': string;
  'Website Status': string;
  
  // Contact Forms
  'Contact Form URL': string;
  'Contact Form Working': string;
  
  // Business Details
  'Revenue': string;
  'Revenue (Exact)': string;
  'Employee Count': string;
  'Employee Count (Exact)': string;
  'Company Type': string;
  'Year Founded': string;
  'Company Age': string;
  
  // Business Verification
  'Tax ID (EIN)': string;
  'Registration State': string;
  'Business Status': string;
  'Business Verified': string;
  
  // Data Quality & Sources
  'Enrichment Level': string;
  'Last Enriched': string;
  'Data Sources': string;
  
  // Additional Info
  'Google Maps Link': string;
  'Date Added': string;
}

// Convert Place data to comprehensive export format
export function formatPlaceForExport(place: Place): ComprehensiveExportData {
  const mapsLink = place.latitude && place.longitude 
    ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
    : '';

  // Format data sources for display
  const dataSources = place.data_sources 
    ? Object.entries(place.data_sources)
        .filter(([, value]) => value)
        .map(([key]) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()))
        .join(', ')
    : '';

  return {
    // Basic Company Information
    'Company Name': place.name || '',
    'Industry': place.industry || '',
    'Address': place.address || '',
    'City': place.city || '',
    'Category': place.category || '',
    
    // Contact Information
    'Phone': place.phone || '',
    'Phone Verified': place.phone_verified ? 'Yes' : 'No',
    'Email': place.email || '',
    'Email Verified': place.email_verified ? 'Yes' : 'No',
    'Website': place.website || '',
    'Website Status': place.website_status || '',
    
    // Contact Forms
    'Contact Form URL': place.contact_form_url || '',
    'Contact Form Working': place.contact_form_working ? 'Yes' : 'No',
    
    // Business Details
    'Revenue': place.revenue || '',
    'Revenue (Exact)': place.revenue_exact ? `$${place.revenue_exact.toLocaleString()}` : '',
    'Employee Count': place.employee_count || '',
    'Employee Count (Exact)': place.employee_count_exact ? place.employee_count_exact.toString() : '',
    'Company Type': place.company_type || '',
    'Year Founded': place.year_founded ? place.year_founded.toString() : '',
    'Company Age': place.company_age ? `${place.company_age} years` : '',
    
    // Business Verification
    'Tax ID (EIN)': place.tax_id || '',
    'Registration State': place.registration_state || '',
    'Business Status': place.business_status || '',
    'Business Verified': place.business_verified ? 'Yes' : 'No',
    
    // Data Quality & Sources
    'Enrichment Level': place.enrichment_level || 'basic',
    'Last Enriched': place.last_enriched_at ? new Date(place.last_enriched_at).toLocaleDateString() : '',
    'Data Sources': dataSources,
    
    // Additional Info
    'Google Maps Link': mapsLink,
    'Date Added': new Date(place.stored_at).toLocaleDateString()
  };
}

// Download places as CSV with comprehensive data
export function downloadAsCSV(places: Place[], filename?: string) {
  const exportData = places.map(formatPlaceForExport);
  
  // Convert to CSV format
  const headers = Object.keys(exportData[0] || {});
  const csvContent = [
    headers.join(','),
    ...exportData.map(row => 
      headers.map(header => {
        const value = row[header as keyof ComprehensiveExportData] || '';
        // Escape commas and quotes in CSV
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const defaultFilename = `comprehensive-leads-export-${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, filename || defaultFilename);
}

// Download places as Excel with comprehensive data
export function downloadAsExcel(places: Place[], filename?: string) {
  const exportData = places.map(formatPlaceForExport);
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for better readability of all comprehensive fields
  const columnWidths = [
    { wch: 30 }, // Company Name
    { wch: 20 }, // Industry
    { wch: 40 }, // Address
    { wch: 15 }, // City
    { wch: 20 }, // Category
    { wch: 18 }, // Phone
    { wch: 12 }, // Phone Verified
    { wch: 25 }, // Email
    { wch: 12 }, // Email Verified
    { wch: 30 }, // Website
    { wch: 15 }, // Website Status
    { wch: 40 }, // Contact Form URL
    { wch: 15 }, // Contact Form Working
    { wch: 15 }, // Revenue
    { wch: 18 }, // Revenue (Exact)
    { wch: 15 }, // Employee Count
    { wch: 18 }, // Employee Count (Exact)
    { wch: 15 }, // Company Type
    { wch: 12 }, // Year Founded
    { wch: 12 }, // Company Age
    { wch: 15 }, // Tax ID (EIN)
    { wch: 18 }, // Registration State
    { wch: 15 }, // Business Status
    { wch: 15 }, // Business Verified
    { wch: 15 }, // Enrichment Level
    { wch: 15 }, // Last Enriched
    { wch: 30 }, // Data Sources
    { wch: 25 }, // Google Maps Link
    { wch: 12 }  // Date Added
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Comprehensive Leads');

  // Generate Excel file and download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const defaultFilename = `comprehensive-leads-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, filename || defaultFilename);
}

// Get comprehensive export summary statistics
export function getExportSummary(places: Place[]) {
  const withPhone = places.filter(p => p.phone).length;
  const withWebsite = places.filter(p => p.website).length;
  const withEmail = places.filter(p => p.email).length;
  const phoneVerified = places.filter(p => p.phone_verified).length;
  const emailVerified = places.filter(p => p.email_verified).length;
  const withContactForm = places.filter(p => p.contact_form_url).length;
  const contactFormWorking = places.filter(p => p.contact_form_working).length;
  const withRevenue = places.filter(p => p.revenue).length;
  const withEmployeeCount = places.filter(p => p.employee_count).length;
  const withCompanyType = places.filter(p => p.company_type).length;
  const withIndustry = places.filter(p => p.industry).length;
  const enriched = places.filter(p => p.enrichment_level === 'enhanced').length;
  
  const categories = new Set(places.map(p => p.category).filter(Boolean));
  const industries = new Set(places.map(p => p.industry).filter(Boolean));
  const cities = new Set(places.map(p => p.city).filter(Boolean));

  return {
    total: places.length,
    
    // Contact Information
    withPhone,
    withWebsite,
    withEmail,
    phoneVerified,
    emailVerified,
    withBothContacts: places.filter(p => p.phone && p.website).length,
    withAllContacts: places.filter(p => p.phone && p.website && p.email).length,
    
    // Contact Forms
    withContactForm,
    contactFormWorking,
    
    // Business Information
    withRevenue,
    withEmployeeCount,
    withCompanyType,
    withIndustry,
    
    // Data Quality
    enriched,
    enrichmentPercentage: Math.round((enriched / places.length) * 100),
    
    // Diversity Metrics
    categoriesCount: categories.size,
    industriesCount: industries.size,
    citiesCount: cities.size,
    
    // Percentages
    phonePercentage: Math.round((withPhone / places.length) * 100),
    websitePercentage: Math.round((withWebsite / places.length) * 100),
    emailPercentage: Math.round((withEmail / places.length) * 100),
    contactFormPercentage: Math.round((withContactForm / places.length) * 100),
    revenueDataPercentage: Math.round((withRevenue / places.length) * 100),
    employeeDataPercentage: Math.round((withEmployeeCount / places.length) * 100)
  };
} 