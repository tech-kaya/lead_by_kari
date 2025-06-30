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
    name: string;
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
  async places(query: string, forceFresh = false): Promise<ApiResponse<SearchResponse>> {
    return apiRequest<SearchResponse>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, forceFresh }),
    });
  },
};

// SWR fetcher function
export const fetcher = (url: string) => fetch(url).then((res) => res.json()); 