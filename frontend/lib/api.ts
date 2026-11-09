/**
 * MeFleet Frontend API Client Configuration
 * Centralizes backend URL resolution to enable environment-driven configuration.
 */

export const API_BASE_URL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Returns a fully qualified URL for a backend API endpoint.
 * Example: apiUrl('/api/fleet/') -> 'http://localhost:8000/api/fleet/'
 */
export function apiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
}

