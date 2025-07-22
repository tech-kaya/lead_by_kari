import type { User } from './auth';
import type { Place } from './places';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  warning?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface SearchResponse {
  places: Place[];
  warning?: string;
}

export interface ContactRequest {
  id: number;
  user_id: number;
  user_email: string;
  place_id: string;
  company_name: string;
  company_email?: string;
  company_phone?: string;
  company_website?: string;
  status: string;
  created_at: string;
}

export interface ContactResponse {
  message: string;
  requests: ContactRequest[];
  user: { email: string; name: string };
}

export interface ParseQueryResponse {
  searchParams: {
    location: string;
    industry: string;
    companyType: string;
    facilityType: string;
    keywords: string;
  };
  confidence: number;
  reasoning: string;
}

// Generic API request handler with error handling
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || `HTTP ${response.status}` };
    }

    return { data, warning: data.warning };
  } catch (error) {
    console.error('API request failed:', error);
    return { error: 'Network error occurred' };
  }
}

// Authentication API calls
export const auth = {
  async signUp(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return apiRequest<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    });
  },
};

// Search API calls
export const search = {
  async places(query: string, forceFresh = false, maxResults?: number): Promise<ApiResponse<SearchResponse>> {
    return apiRequest<SearchResponse>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, forceFresh, maxResults }),
    });
  },
  async parseQuery(query: string): Promise<ApiResponse<ParseQueryResponse>> {
    return apiRequest<ParseQueryResponse>('/api/parse-query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },
};

// Contact API calls
export const contact = {
  async sendRequests(place_ids: string[]): Promise<ApiResponse<ContactResponse>> {
    console.log('API Library - Sending contact request with place_ids:', place_ids);
    
    // Get user email from localStorage
    let email = '';
    
    try {
      // Check for user data in localStorage
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        email = user.email || '';
      }
      
      // Fallback to email stored separately
      if (!email) {
        email = localStorage.getItem('email') || '';
      }
    } catch (error) {
      console.error('Error reading user data from localStorage:', error);
      // Fallback to email stored separately
      email = localStorage.getItem('email') || '';
    }
    
    const payload = { 
      email,
      place_ids
    };
    console.log('API Library - Request payload:', payload);
    
    return apiRequest<ContactResponse>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};

// SWR fetcher function
export const fetcher = (url: string) => fetch(url).then((res) => res.json()); 