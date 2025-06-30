'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import SearchForm, { type SearchParams } from '@/components/SearchForm';
import PlaceCard from '@/components/PlaceCard';
import { search, auth } from '@/lib/api';
import type { Place } from '@/lib/places';

export default function HomePage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const router = useRouter();

  const buildSearchQuery = (searchParams: SearchParams): string => {
    const parts = [];
    
    if (searchParams.industry) parts.push(searchParams.industry);
    if (searchParams.companyType) parts.push(searchParams.companyType);
    if (searchParams.facilityType) parts.push(searchParams.facilityType);
    if (searchParams.keywords) parts.push(searchParams.keywords);
    if (searchParams.location) parts.push(`in ${searchParams.location}`);
    
    return parts.join(' ') || searchParams.location || 'businesses';
  };

  const handleSearch = async (searchParams: SearchParams, forceFresh: boolean) => {
    setIsLoading(true);
    setError(null);
    setWarning(null);
    
    try {
      const query = buildSearchQuery(searchParams);
      const response = await search.places(query, forceFresh);
      
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
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">Leads by Kari</h1>
            <button
              type="button"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {places.map((place) => (
                <PlaceCard key={`${place.place_id}-${place.id}`} place={place} />
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
