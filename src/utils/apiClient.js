import axios from 'axios';

// Create a secure API client with axios
export const secureApiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for adding auth token
secureApiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Add CSRF token if available (from cookie)
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
secureApiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized (expired token)
    if (error.response && error.response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('auth_token');
      
      // Redirect to login page
      window.location.href = '/login?session=expired';
    }
    
    return Promise.reject(error);
  }
);

// Helper function to get cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Export with additional security functions
export const securityUtils = {
  // Function to sanitize data before displaying (XSS prevention)
  sanitizeOutput: (data) => {
    // Simple example - in production use a proper sanitization library
    if (typeof data === 'string') {
      const element = document.createElement('div');
      element.textContent = data;
      return element.innerHTML;
    }
    return data;
  },
  
  // Generate a nonce for CSP
  generateNonce: () => {
    return Math.random().toString(36).substring(2, 15);
  }
};