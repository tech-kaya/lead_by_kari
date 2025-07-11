'use client';

import { useState } from 'react';

interface SearchFormProps {
  onSearch: (searchParams: SearchParams, forceFresh: boolean) => void;
  isLoading: boolean;
}

export interface SearchParams {
  location: string;
  industry: string;
  companyType: string;
  facilityType: string;
  keywords: string;
}

export default function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [searchParams, setSearchParams] = useState<SearchParams>({
    location: '',
    industry: '',
    companyType: '',
    facilityType: '',
    keywords: ''
  });
  const [forceFresh, setForceFresh] = useState(false);

  const handleInputChange = (field: keyof SearchParams, value: string) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
  };

  const buildSearchQuery = (params: SearchParams): string => {
    const parts = [];
    
    if (params.industry) parts.push(params.industry);
    if (params.companyType) parts.push(params.companyType);
    if (params.facilityType) parts.push(params.facilityType);
    if (params.keywords) parts.push(params.keywords);
    if (params.location) parts.push(`in ${params.location}`);
    
    return parts.join(' ') || params.location || 'businesses';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = buildSearchQuery(searchParams);
    if (query.trim()) {
      onSearch(searchParams, forceFresh);
    }
  };

  const isFormValid = searchParams.location.trim() || searchParams.industry.trim() || 
                      searchParams.companyType.trim() || searchParams.facilityType.trim() || 
                      searchParams.keywords.trim();

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Perfect Business Leads</h2>
          <p className="text-gray-600">Use our advanced filters to discover high-quality prospects in your target market</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Location */}
            <div className="flex flex-col space-y-3">
              <label htmlFor="location" className="text-sm font-semibold text-gray-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Location *
              </label>
              <input
                id="location"
                type="text"
                value={searchParams.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="City, state, ZIP code, or region..."
                className="w-full text-gray-900 px-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm hover:border-gray-300"
                disabled={isLoading}
              />
            </div>

            {/* Industry */}
            <div className="flex flex-col space-y-3">
              <label htmlFor="industry" className="text-sm font-semibold text-gray-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                  <path d="M2 13.692V16a2 2 0 002 2h12a2 2 0 002-2v-2.308A24.974 24.974 0 0110 15c-2.796 0-5.487-.46-8-1.308z" />
                </svg>
                Industry
              </label>
              <select
                id="industry"
                value={searchParams.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full text-gray-900 px-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm hover:border-gray-300"
                disabled={isLoading}
              >
                <option value="">Select industry...</option>
                <option value="restaurant">Restaurants & Food Service</option>
                <option value="retail">Retail & Shopping</option>
                <option value="healthcare">Healthcare & Medical</option>
                <option value="automotive">Automotive</option>
                <option value="real estate">Real Estate</option>
                <option value="technology">Technology</option>
                <option value="construction">Construction</option>
                <option value="manufacturing">Manufacturing</option>
                <option value="finance">Finance & Banking</option>
                <option value="education">Education</option>
                <option value="hospitality">Hotels & Hospitality</option>
                <option value="fitness">Fitness & Wellness</option>
                <option value="beauty">Beauty & Personal Care</option>
                <option value="legal">Legal Services</option>
                <option value="consulting">Consulting</option>
              </select>
            </div>

            {/* Company Type */}
            <div className="flex flex-col space-y-3">
              <label htmlFor="companyType" className="text-sm font-semibold text-gray-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                </svg>
                Company Type
              </label>
              <select
                id="companyType"
                value={searchParams.companyType}
                onChange={(e) => handleInputChange('companyType', e.target.value)}
                className="w-full text-gray-900 px-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm hover:border-gray-300"
                disabled={isLoading}
              >
                <option value="">Select company type...</option>
                <option value="small business">Small Business</option>
                <option value="startup">Startup</option>
                <option value="corporation">Corporation</option>
                <option value="franchise">Franchise</option>
                <option value="chain">Chain Store</option>
                <option value="local business">Local Business</option>
                <option value="enterprise">Enterprise</option>
                <option value="nonprofit">Non-Profit</option>
              </select>
            </div>

            {/* Facility Type */}
            <div className="flex flex-col space-y-3">
              <label htmlFor="facilityType" className="text-sm font-semibold text-gray-800 flex items-center">
                <svg className="w-4 h-4 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10.496 2.132a1 1 0 00-.992 0l-7 4A1 1 0 003 8v7a3 3 0 003 3h4a3 3 0 003-3h1a3 3 0 003-3V8a1 1 0 00.496-1.868l-7-4zM6 9a1 1 0 000 2h2a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Facility Type
              </label>
              <select
                id="facilityType"
                value={searchParams.facilityType}
                onChange={(e) => handleInputChange('facilityType', e.target.value)}
                className="w-full text-gray-900 px-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm hover:border-gray-300"
                disabled={isLoading}
              >
                <option value="">Select facility type...</option>
                <option value="office">Office Building</option>
                <option value="storefront">Storefront</option>
                <option value="warehouse">Warehouse</option>
                <option value="factory">Factory</option>
                <option value="clinic">Clinic</option>
                <option value="shop">Shop</option>
                <option value="center">Center</option>
                <option value="plaza">Plaza</option>
                <option value="mall">Mall</option>
                <option value="complex">Complex</option>
              </select>
            </div>
          </div>

          {/* Keywords */}
          <div className="flex flex-col space-y-3">
            <label htmlFor="keywords" className="text-sm font-semibold text-gray-800 flex items-center">
              <svg className="w-4 h-4 mr-2 text-indigo-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              Additional Keywords
            </label>
            <input
              id="keywords"
              type="text"
              value={searchParams.keywords}
              onChange={(e) => handleInputChange('keywords', e.target.value)}
              placeholder="Specific business names, services, or additional search terms..."
              className="w-full text-gray-900 px-4 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all duration-200 shadow-sm hover:border-gray-300"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                id="forceFresh"
                type="checkbox"
                checked={forceFresh}
                onChange={(e) => setForceFresh(e.target.checked)}
                className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-600 font-medium">Force fresh fetch (bypass cache)</span>
            </label>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                  Searching for leads...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                  Search for Leads
                </div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 