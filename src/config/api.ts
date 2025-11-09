/**
 * API Configuration
 * 
 * Centralized configuration for API endpoints.
 * Uses Vite environment variables for build-time configuration.
 * 
 * Environment Variables:
 * - VITE_API_URL: Base URL for the API (e.g., "https://api.wod.wiki/api" or "http://localhost:6007/api")
 * 
 * Default: Falls back to localhost:6007 for development
 */

const DEFAULT_API_URL = 'http://localhost:6007/api';

/**
 * Get the configured API base URL
 * @returns The API base URL from environment or default
 */
export function getApiBaseUrl(): string {
  // Vite exposes environment variables via import.meta.env
  // They must be prefixed with VITE_ to be exposed to the client
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
    if (apiUrl) {
      return apiUrl;
    }
  }
  
  // Fallback for development
  return DEFAULT_API_URL;
}

/**
 * API base URL constant
 * Use this throughout the application for API requests
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Get the full URL for an API endpoint
 * @param path - The API path (e.g., "/workouts/crossfit")
 * @returns Full URL to the API endpoint
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
