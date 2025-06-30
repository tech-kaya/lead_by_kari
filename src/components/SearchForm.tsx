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
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Location */}
          <div className="flex flex-col space-y-2">
            <label htmlFor="location" className="text-sm font-medium text-gray-700">
              Location *
            </label>
            <input
              id="location"
              type="text"
              value={searchParams.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="City, state, ZIP code, or region..."
              className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Industry */}
          <div className="flex flex-col space-y-2">
            <label htmlFor="industry" className="text-sm font-medium text-gray-700">
              Industry
            </label>
            <select
              id="industry"
              value={searchParams.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
          <div className="flex flex-col space-y-2">
            <label htmlFor="companyType" className="text-sm font-medium text-gray-700">
              Company Type
            </label>
            <select
              id="companyType"
              value={searchParams.companyType}
              onChange={(e) => handleInputChange('companyType', e.target.value)}
              className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
          <div className="flex flex-col space-y-2">
            <label htmlFor="facilityType" className="text-sm font-medium text-gray-700">
              Facility Type
            </label>
            <select
              id="facilityType"
              value={searchParams.facilityType}
              onChange={(e) => handleInputChange('facilityType', e.target.value)}
              className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
        <div className="flex flex-col space-y-2">
          <label htmlFor="keywords" className="text-sm font-medium text-gray-700">
            Additional Keywords
          </label>
          <input
            id="keywords"
            type="text"
            value={searchParams.keywords}
            onChange={(e) => handleInputChange('keywords', e.target.value)}
            placeholder="Specific business names, services, or additional search terms..."
            className="w-full text-black px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            id="forceFresh"
            type="checkbox"
            checked={forceFresh}
            onChange={(e) => setForceFresh(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={isLoading}
          />
          <label htmlFor="forceFresh" className="text-sm text-gray-600">
            Force fresh fetch (bypass cache)
          </label>
        </div>

        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Searching for leads...
            </div>
          ) : (
            'Search for Leads'
          )}
        </button>
      </form>
    </div>
  );
} 