// Centralized API Configuration
// Auto-detects GitHub Codespaces and uses correct URL

const getApiBaseUrl = (): string => {
  // Check if we're in GitHub Codespaces (browser context)
  if (typeof window !== 'undefined' && window.location.hostname.includes('.app.github.dev')) {
    // Extract codespace name from current URL and construct backend URL
    const hostname = window.location.hostname;
    const codespaceBase = hostname.replace(/-\d+\.app\.github\.dev$/, '');
    return `https://${codespaceBase}-5000.app.github.dev`;
  }
  
  // Check environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

export default API_BASE_URL;
