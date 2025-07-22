'use client';

import { useState } from 'react';
import { search } from '@/lib/api';

interface SearchFormProps {
  onSearch: (searchParams: SearchParams, forceFresh: boolean, maxResults?: number) => void;
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
  const [smartQuery, setSmartQuery] = useState('');
  const [maxResults, setMaxResults] = useState(20);
  const [isParsingQuery, setIsParsingQuery] = useState(false);

  const handleSmartQueryChange = (value: string) => {
    setSmartQuery(value);
  };

  const clearSmartQuery = () => {
    setSmartQuery('');
  };

  const handleMaxResultsChange = (value: number) => {
    // Ensure value is between 1 and 60
    const clampedValue = Math.min(Math.max(value, 1), 60);
    setMaxResults(clampedValue);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (smartQuery.trim()) {
      setIsParsingQuery(true);
      
      try {
        const response = await search.parseQuery(smartQuery);
        
        if (response.error) {
          console.error('Parse error:', response.error);
          alert(`Failed to parse query: ${response.error}`);
          setIsParsingQuery(false);
          return;
        }
        
        if (response.data) {
          // Use parsed parameters for search with specified max results
          onSearch(response.data.searchParams, false, maxResults);
        }
      } catch (error) {
        console.error('Parse query error:', error);
        alert('Failed to parse query. Please try again.');
      } finally {
        setIsParsingQuery(false);
      }
    }
  };

  const isFormValid = smartQuery.trim();

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI-Powered Lead Generation</h2>
          <p className="text-gray-600">Describe what you&apos;re looking for in natural language, and our AI will find the perfect business leads</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
            <div className="flex items-center mb-4">
              <svg className="w-6 h-6 mr-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
              </svg>
              <h3 className="text-lg font-semibold text-purple-900">AI Smart Search</h3>
            </div>
            
            <p className="text-sm text-purple-700 mb-4">
              Simply describe the type of businesses you want to find. Our AI will understand your intent and search for comprehensive company data including contact information, revenue, employee count, and more!
            </p>
            
            <div className="flex flex-col space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="smartQuery" className="text-sm font-medium text-purple-800">
                    What type of businesses are you looking for?
                  </label>
                  {smartQuery && (
                    <button
                      type="button"
                      onClick={clearSmartQuery}
                      disabled={isLoading || isParsingQuery}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  id="smartQuery"
                  value={smartQuery}
                  onChange={(e) => handleSmartQueryChange(e.target.value)}
                  placeholder="Examples:
• 'Small tech companies in San Francisco'
• 'Restaurants and cafes in New York City'
• 'Healthcare startups with 10-50 employees'
• 'Manufacturing companies in Texas'
• 'Real estate agencies in Miami'
• 'Retail stores in downtown Chicago'"
                  className="w-full text-black px-4 py-4 bg-white border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 shadow-sm hover:border-purple-300 resize-none text-base"
                  rows={6}
                  disabled={isLoading || isParsingQuery}
                  maxLength={500}
                />
                <div className="flex justify-between items-center">
                  <div className="text-xs text-purple-600">
                    {smartQuery.length}/500 characters
                  </div>
                  <div className="text-xs text-purple-600">
                    💡 Be as specific as possible for better results
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Number of Results */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <label htmlFor="maxResults" className="text-sm font-medium text-blue-800">
                  Number of leads to find:
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  id="maxResults"
                  type="number"
                  min="1"
                  max="60"
                  value={maxResults}
                  onChange={(e) => handleMaxResultsChange(Number.parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 bg-white border-2 border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 text-center font-semibold text-blue-900"
                  disabled={isLoading || isParsingQuery}
                />
                <span className="text-sm text-blue-600 font-medium">leads</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-blue-600">
              Choose between 1-60 leads. More leads = more comprehensive market coverage but longer search time.
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={isLoading || isParsingQuery || !isFormValid}
              className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
            >
              {isParsingQuery ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
                  AI is analyzing your request...
                </div>
              ) : isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3" />
                  Finding {maxResults} comprehensive leads...
                </div>
              ) : (
                <div className="flex items-center">
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" clipRule="evenodd" />
                  </svg>
                  Find {maxResults} Leads with AI
                </div>
              )}
            </button>
          </div>
        </form>

        {/* Feature highlights */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900">Comprehensive Data</div>
              <div className="text-xs text-gray-600">Contact info, revenue, employees, verification</div>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900">Real-time Results</div>
              <div className="text-xs text-gray-600">Fresh data from multiple verified sources</div>
            </div>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-sm font-medium text-gray-900">Export Ready</div>
              <div className="text-xs text-gray-600">Download in CSV or Excel format</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 