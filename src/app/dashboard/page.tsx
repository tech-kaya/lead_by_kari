'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchForm, { type SearchParams } from '@/components/SearchForm';
import PlaceCard from '@/components/PlaceCard';
import { search, auth, contact } from '@/lib/api';
import type { Place } from '@/lib/places';
import { downloadAsCSV, downloadAsExcel } from '@/lib/download';

export default function DashboardPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const user = localStorage.getItem('user');
    const email = localStorage.getItem('email');
    
    if (!user || !email) {
      router.push('/landing');
      return;
    }
    
    setIsAuthenticated(true);
  }, [router]);

  const buildSearchQuery = (searchParams: SearchParams): string => {
    const parts = [];
    
    if (searchParams.industry) parts.push(searchParams.industry);
    if (searchParams.companyType) parts.push(searchParams.companyType);
    if (searchParams.facilityType) parts.push(searchParams.facilityType);
    if (searchParams.keywords) parts.push(searchParams.keywords);
    if (searchParams.location) parts.push(`in ${searchParams.location}`);
    
    return parts.join(' ') || searchParams.location || 'businesses';
  };

  const handleSearch = async (searchParams: SearchParams, forceFresh: boolean, maxResults?: number) => {
    setIsLoading(true);
    setError(null);
    setWarning(null);
    
    try {
      const query = buildSearchQuery(searchParams);
      const response = await search.places(query, forceFresh, maxResults);
      
      if (response.error) {
        if (response.error.includes('Authentication required')) {
          router.push('/login');
          return;
        }
        setError(response.error);
        setPlaces([]);
      } else if (response.data) {
        setPlaces(response.data.places);
        setWarning(response.data.warning || null);
      }
    } catch {
      setError('An unexpected error occurred');
      setPlaces([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.logout();
      localStorage.removeItem('user');
      localStorage.removeItem('email');
      router.push('/landing');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSelectionChange = (placeId: string, selected: boolean) => {
    setSelectedPlaces(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(placeId);
      } else {
        newSet.delete(placeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedPlaces.size === places.length) {
      // Deselect all
      setSelectedPlaces(new Set());
    } else {
      // Select all
      setSelectedPlaces(new Set(places.map(place => place.place_id)));
    }
  };

  const handleContactSingle = async (placeId: string) => {
    await handleContactSelected([placeId]);
  };

  const handleContactSelected = async (placeIds?: string[]) => {
    const idsToContact = placeIds || Array.from(selectedPlaces);
    
    console.log('Frontend - Contact request for place IDs:', idsToContact);
    
    if (idsToContact.length === 0) {
      setError('Please select at least one company to contact');
      return;
    }

    setIsContactLoading(true);
    setError(null);
    setContactSuccess(null);

    try {
      console.log('Frontend - Sending contact request...');
      const response = await contact.sendRequests(idsToContact);
      console.log('Frontend - Contact response:', response);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setContactSuccess(response.data.message);
        // Clear selections after successful contact
        if (!placeIds) {
          setSelectedPlaces(new Set());
        }
      }
    } catch (err) {
      console.error('Frontend - Contact request failed:', err);
      setError('Failed to send contact requests');
    } finally {
      setIsContactLoading(false);
    }
  };

  const handleDownloadSelected = (format: 'csv' | 'excel') => {
    const selectedData = places.filter(place => selectedPlaces.has(place.place_id));
    
    if (selectedData.length === 0) {
      setError('Please select at least one company to download');
      return;
    }

    const filename = `selected-leads-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      downloadAsCSV(selectedData, `${filename}.csv`);
    } else {
      downloadAsExcel(selectedData, `${filename}.xlsx`);
    }
  };

  const handleDownloadAll = (format: 'csv' | 'excel') => {
    if (places.length === 0) {
      setError('No leads available to download');
      return;
    }

    const filename = `all-leads-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      downloadAsCSV(places, `${filename}.csv`);
    } else {
      downloadAsExcel(places, `${filename}.xlsx`);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo/Brand Section */}
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-white bg-opacity-20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Leads by Kari</h1>
                <p className="text-indigo-100 text-sm hidden sm:block">Lead Generation Platform</p>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-6">
              {/* User Profile Section */}
              <div className="hidden lg:flex items-center space-x-4">
                <div className="relative">
                  {/* Profile Avatar with Status Indicator */}
                  <div className="h-10 w-10 bg-gradient-to-br from-white to-indigo-100 rounded-full flex items-center justify-center shadow-lg border-2 border-white border-opacity-30">
                    <svg className="h-6 w-6 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  {/* Online Status Indicator */}
                  <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 border-2 border-white rounded-full" />
                </div>
                <div className="text-white">
                  <p className="text-sm font-semibold">Welcome back!</p>
                  <p className="text-xs text-indigo-200 font-medium">Ready to find leads?</p>
                </div>
              </div>

              {/* Mobile User Icon */}
              <div className="lg:hidden">
                <div className="h-8 w-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white border-opacity-30">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="group inline-flex items-center px-5 py-2.5 bg-white bg-opacity-25 hover:bg-opacity-35 text-gray-800 hover:text-gray-900 text-sm font-bold rounded-xl border-2 border-white border-opacity-40 hover:border-opacity-60 transition-all duration-300 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-70 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline font-bold">Logout</span>
                <span className="sm:hidden">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Border */}
        <div className="h-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Generate High-Quality Business Leads
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Find targeted business prospects by industry, company type, facility, and location. 
            Our advanced search fetches comprehensive results (up to 60+ businesses per search) 
            with complete contact information including websites and phone numbers from Google Places.
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <SearchForm onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Warning Message */}
        {warning && (
          <div className="mb-6 max-w-2xl mx-auto">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">{warning}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {contactSuccess && (
          <div className="mb-6 max-w-2xl mx-auto">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L8.23 10.661a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{contactSuccess}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 max-w-2xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {places.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Business Leads ({places.length} prospects found)
              </h3>
            </div>

            {/* Bulk Actions */}
            <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Selection Controls */}
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedPlaces.size === places.length && places.length > 0}
                      onChange={handleSelectAll}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                    />
                    <span className="text-sm font-semibold text-gray-800">
                      Select All
                    </span>
                  </label>
                  <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full border">
                    {selectedPlaces.size} of {places.length} selected
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Contact Actions */}
                  <div className="flex items-center space-x-3">
                    {selectedPlaces.size > 0 && (
                      <button
                        type="button"
                        onClick={() => handleContactSelected()}
                        disabled={isContactLoading}
                        className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-md"
                      >
                        {isContactLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            Contact ({selectedPlaces.size})
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Download Actions */}
                  <div className="flex items-center space-x-2">
                    {/* Download Selected */}
                    {selectedPlaces.size > 0 && (
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadSelected('csv')}
                          className="inline-flex items-center px-3 py-2.5 bg-green-600 text-white text-sm font-medium rounded-l-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          title="Download selected as CSV"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          CSV
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadSelected('excel')}
                          className="inline-flex items-center px-3 py-2.5 bg-green-600 text-white text-sm font-medium rounded-r-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors border-l border-green-500"
                          title="Download selected as Excel"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Excel
                        </button>
                      </div>
                    )}

                    {/* Download All */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadAll('csv')}
                        className="inline-flex items-center px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-l-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        title="Download all results as CSV"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        All CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAll('excel')}
                        className="inline-flex items-center px-3 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-r-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors border-l border-blue-500"
                        title="Download all results as Excel"
                      >
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        All Excel
                      </button>
                    </div>
                  </div>

                  {/* Help Text */}
                  {selectedPlaces.size === 0 && (
                    <div className="text-sm text-gray-500 italic sm:ml-4">
                      Select companies for targeted actions
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {places.map((place) => (
                <PlaceCard 
                  key={`${place.place_id}-${place.id}`} 
                  place={place}
                  isSelected={selectedPlaces.has(place.place_id)}
                  onSelectionChange={handleSelectionChange}
                  onContactClick={handleContactSingle}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && !error && places.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No leads found yet</h3>
            <p className="mt-1 text-sm text-gray-500">Use the search form above to find business prospects in your target market.</p>
          </div>
        )}
      </main>
    </div>
  );
} 