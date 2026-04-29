/**
 * Centralized API Configuration Utility
 * 
 * This module provides a single source of truth for API URL configuration.
 * It uses RUNTIME detection to ensure the correct URL is used regardless of
 * when/where the build was created.
 * 
 * Usage:
 *   import { getApiBaseUrl, getApiUrl, API_BASE_URL, API_URL } from '@/utils/apiConfig';
 */

/**
 * Get the API base URL (without /api suffix)
 * Priority: Runtime detection > Environment variables > Localhost fallback
 */
export const getApiBaseUrl = (): string => {
  // Check if we're in a browser context (runtime detection)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // Production: edwardiansacademy.com (any subdomain)
    if (hostname.includes('edwardiansacademy.com')) {
      return 'https://api.edwardiansacademy.com';
    }

    // GitHub Codespaces
    if (hostname.includes('.app.github.dev')) {
      const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
      return `https://${codespaceBase}-5001.app.github.dev`;
    }
  }

  // Check environment variable (build-time) - secondary priority
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");
  }

  // Legacy variable support
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, "").replace(/\/api$/, "");
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:5001';
};

/**
 * Get the full API URL (with /api suffix)
 */
export const getApiUrl = (): string => {
  return `${getApiBaseUrl()}/api`;
};

// Pre-computed constants for convenience
export const API_BASE_URL = getApiBaseUrl();
export const API_URL = getApiUrl();

export default API_BASE_URL;