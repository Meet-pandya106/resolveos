/**
 * ResolveOS Web API Client
 * Typed fetch client with Bearer authentication, centralized error handling, and offline queue fallback.
 */

import { offlineSync } from './offlineSync.js';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class APIClient {
  private static token: string | null = localStorage.getItem('resolveos_token');

  static setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('resolveos_token', token);
    } else {
      localStorage.removeItem('resolveos_token');
    }
  }

  static getToken(): string | null {
    return this.token || localStorage.getItem('resolveos_token');
  }

  static async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const baseUrl = '/api';
    let url = `${baseUrl}${endpoint}`;

    if (options.params) {
      const query = new URLSearchParams();
      Object.entries(options.params).forEach(([k, v]) => {
        if (v !== undefined) query.append(k, String(v));
      });
      const queryString = query.toString();
      if (queryString) url += `?${queryString}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(options.headers as any)
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Clear stale session
        this.setToken(null);
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
      }

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || `Request failed with status ${response.status}`);
      }

      // Check if response is empty or CSV
      const contentType = response.headers.get('Content-Type');
      if (contentType && contentType.includes('text/csv')) {
        return (await response.text()) as any;
      }

      return await response.json();
    } catch (err: any) {
      // Check offline mode
      if (!navigator.onLine || err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        // If it's a mutation (POST/PUT/PATCH/DELETE), capture in offline sync queue
        if (options.method && options.method !== 'GET') {
          console.warn('[APIClient] Network offline. Enqueuing mutation for background synchronization.');
          offlineSync.enqueueMutation({
            endpoint,
            method: options.method,
            body: options.body ? JSON.parse(options.body as string) : undefined
          });
          return { _offlineQueued: true, message: 'Changes saved locally and queued for synchronization.' } as any;
        }
      }
      throw err;
    }
  }

  static get<T = any>(endpoint: string, params?: Record<string, any>) {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  static post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static patch<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static delete<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined
    });
  }
}
