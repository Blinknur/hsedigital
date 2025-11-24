
import { Organization, User } from '../types';

// In production, API is served from the same origin via the Node server proxying or serving static files.
// In dev (Vite), we use the proxy defined in vite.config.ts
const API_BASE_URL = '/api';

/**
 * Generic HTTP Client handling Auth headers, error parsing, and Token Refresh.
 */
class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private onRefreshed(token: string) {
    this.refreshSubscribers.map(cb => cb(token));
    this.refreshSubscribers = [];
  }

  private subscribeTokenRefresh(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('accessToken');
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 (Unauthorized) - Try to refresh token
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          this.logout();
          throw new Error("Session expired. Please login again.");
        }

        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshResponse.ok) {
              const data = await refreshResponse.json();
              localStorage.setItem('accessToken', data.accessToken);
              if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
              
              this.onRefreshed(data.accessToken);
              this.isRefreshing = false;
              
              // Retry original request with new token
              return this.request<T>(endpoint, options);
            } else {
              this.isRefreshing = false;
              this.logout();
              throw new Error("Session expired.");
            }
          } catch (e) {
            this.isRefreshing = false;
            this.logout();
            throw e;
          }
        } else {
          // If already refreshing, queue the request
          return new Promise((resolve) => {
            this.subscribeTokenRefresh(() => {
              resolve(this.request<T>(endpoint, options));
            });
          });
        }
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.message || errorBody.error || `API Error: ${response.statusText}`);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return response.json();
    } catch (error) {
      // console.error("API Request Failed:", error);
      throw error;
    }
  }

  private logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('loggedInUserId');
    window.location.hash = '#/login';
  }

  // --- HTTP Methods ---

  public get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params)}` 
      : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  public post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  public put<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  public delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const client = new ApiClient();
