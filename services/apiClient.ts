/**
 * Centralized API Client
 * 
 * Handles base URL, authentication headers, and standard error handling
 * for all backend service calls.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api-production-5f42.up.railway.app';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;
  const { headers, ...rest } = fetchOptions;
  
  // 1. Construct URL with query params
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => searchParams.append(key, String(val)));
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}${searchParams.toString()}`;
  }

  // 2. Prepare headers
  const token = localStorage.getItem('hnh_token');
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // 3. Execute fetch
  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        ...defaultHeaders,
        ...headers,
      },
    });

    // 4. Handle non-ok responses
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new ApiError(response.status, errorData.error || response.statusText, errorData);
    }

    // 5. Parse JSON response
    // If response is empty (204 No Content), return null
    if (response.status === 204) return null as T;
    
    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error(`[API_CLIENT] Request failed: ${url}`, error);
    throw new Error('Network error or server unreachable');
  }
}

export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, string | number>, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'GET', params }),
    
  post: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
    
  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
    
  put: <T>(endpoint: string, body?: any, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
    
  delete: <T>(endpoint: string, options?: RequestOptions) => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
