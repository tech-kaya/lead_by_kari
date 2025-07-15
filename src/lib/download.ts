import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { Place } from './places';

export interface ExportData {
  'Company Name': string;
  'Address': string;
  'City': string;
  'Category': string;
  'Phone': string;
  'Website': string;
  'Google Maps Link': string;
  'Date Added': string;
}

// Convert Place data to export format
export function formatPlaceForExport(place: Place): ExportData {
  const mapsLink = place.latitude && place.longitude 
    ? `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`
    : '';

  return {
    'Company Name': place.name || '',
    'Address': place.address || '',
    'City': place.city || '',
    'Category': place.category || '',
    'Phone': place.phone || '',
    'Website': place.website || '',
    'Google Maps Link': mapsLink,
    'Date Added': new Date(place.stored_at).toLocaleDateString()
  };
}

// Download places as CSV
export function downloadAsCSV(places: Place[], filename?: string) {
  const exportData = places.map(formatPlaceForExport);
  
  // Convert to CSV format
  const headers = Object.keys(exportData[0] || {});
  const csvContent = [
    headers.join(','),
    ...exportData.map(row => 
      headers.map(header => {
        const value = row[header as keyof ExportData] || '';
        // Escape commas and quotes in CSV
        return `"${value.toString().replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const defaultFilename = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
  saveAs(blob, filename || defaultFilename);
}

// Download places as Excel
export function downloadAsExcel(places: Place[], filename?: string) {
  const exportData = places.map(formatPlaceForExport);
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for better readability
  const columnWidths = [
    { wch: 25 }, // Company Name
    { wch: 35 }, // Address
    { wch: 15 }, // City
    { wch: 20 }, // Category
    { wch: 15 }, // Phone
    { wch: 30 }, // Website
    { wch: 25 }, // Google Maps Link
    { wch: 12 }  // Date Added
  ];
  worksheet['!cols'] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Leads');

  // Generate Excel file and download
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  const defaultFilename = `leads-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, filename || defaultFilename);
}

// Get export summary statistics
export function getExportSummary(places: Place[]) {
  const withPhone = places.filter(p => p.phone).length;
  const withWebsite = places.filter(p => p.website).length;
  const categories = new Set(places.map(p => p.category).filter(Boolean));
  const cities = new Set(places.map(p => p.city).filter(Boolean));

  return {
    total: places.length,
    withPhone,
    withWebsite,
    withBothContacts: places.filter(p => p.phone && p.website).length,
    categoriesCount: categories.size,
    citiesCount: cities.size,
    phonePercentage: Math.round((withPhone / places.length) * 100),
    websitePercentage: Math.round((withWebsite / places.length) * 100)
  };
} 