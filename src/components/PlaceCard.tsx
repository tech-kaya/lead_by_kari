'use client';

import type { Place } from '@/lib/places';

interface PlaceCardProps {
  place: Place;
  isSelected?: boolean;
  onSelectionChange?: (placeId: string, selected: boolean) => void;
  onContactClick?: (placeId: string) => void;
}

export default function PlaceCard({ place, isSelected = false, onSelectionChange, onContactClick }: PlaceCardProps) {
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSelectionChange?.(place.place_id, e.target.checked);
  };

  const handleContactClick = () => {
    console.log('Contact Us clicked for place:', place.place_id, place.name);
    if (onContactClick) {
      onContactClick(place.place_id);
    } else {
      console.warn('onContactClick handler not provided');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-start space-x-3 mb-3">
          {onSelectionChange && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={handleCheckboxChange}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-colors flex-shrink-0"
            />
          )}
          <h3 className="text-lg font-semibold text-gray-900 flex-1 leading-tight min-h-[3.5rem] break-words overflow-hidden">
            <span className="line-clamp-2" title={place.name}>
              {place.name}
            </span>
          </h3>
        </div>
        {place.category && (
          <div className="flex justify-end">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-50 to-indigo-50 text-indigo-700 border border-indigo-200">
              {place.category}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 text-sm text-gray-600 min-h-[8rem]">
        <div className="flex items-start">
          <svg className="w-4 h-4 mt-0.5 mr-2 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span className="line-clamp-2">{place.address}</span>
        </div>

        {place.phone && (
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            <a href={`tel:${place.phone}`} className="text-blue-600 hover:text-blue-800">
              {place.phone}
            </a>
          </div>
        )}

        {place.website && (
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
            </svg>
            <a 
              href={place.website} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 truncate font-medium"
              title={place.website}
            >
              {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          </div>
        )}

        {place.latitude && place.longitude && (
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              View on Maps
            </a>
          </div>
        )}
      </div>

      {/* Contact Actions for Lead Generation - Fixed at bottom */}
      <div className="mt-auto">
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact This Lead</h4>
          <div className="space-y-2">
            {/* Primary Contact Button - Always First */}
            <button
              type="button"
              onClick={handleContactClick}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              Contact Us
            </button>
            
            {/* Secondary Actions - Consistent Grid with Fixed Height */}
            <div className="grid grid-cols-2 gap-2 min-h-[2.5rem]">
              {place.website && (
                <a
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors duration-200 border border-blue-200"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                  </svg>
                  Website
                </a>
              )}
              {place.phone && (
                <a
                  href={`tel:${place.phone}`}
                  className="inline-flex items-center justify-center px-3 py-2 bg-green-50 text-green-700 text-sm font-medium rounded-lg hover:bg-green-100 transition-colors duration-200 border border-green-200"
                >
                  <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  Call
                </a>
              )}
              {!place.website && !place.phone && (
                <div className="col-span-2 flex items-center justify-center text-sm text-gray-500 py-2">
                  No direct contact info available
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Lead generated: {new Date(place.stored_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
} 