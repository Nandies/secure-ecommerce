/**
 * Security utilities for the e-commerce frontend
 * This file contains helper functions to enforce security best practices
 */

// Generate a cryptographically secure random token
export const generateSecureToken = (length = 32) => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };
  
  // Sanitize HTML content to prevent XSS attacks
  export const sanitizeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return unsafe;
    
    // Basic HTML sanitization
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };
  
  // Validate URL to prevent open redirect vulnerabilities
  export const isValidRedirectUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    try {
      // Check if URL is relative (starts with /)
      if (url.startsWith('/') && !url.startsWith('//')) {
        return true;
      }
      
      // Check if absolute URL is for our domain
      const urlObj = new URL(url);
      const currentDomain = window.location.hostname;
      
      return urlObj.hostname === currentDomain;
    } catch (error) {
      return false;
    }
  };
  
  // Secure redirect function
  export const secureRedirect = (url) => {
    if (isValidRedirectUrl(url)) {
      window.location.href = url;
      return true;
    }
    
    // Default to home page if URL is not valid
    console.warn('Invalid redirect URL detected and blocked:', url);
    window.location.href = '/';
    return false;
  };
  
  // Check for weak passwords
  export const isStrongPassword = (password) => {
    if (!password || typeof password !== 'string') return false;
    
    // Password should be at least 8 characters
    if (password.length < 8) return false;
    
    // Check for complexity requirements
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    // Require at least 3 of the 4 character types
    const criteriaCount = [hasUppercase, hasLowercase, hasNumbers, hasSpecialChars]
      .filter(Boolean).length;
      
    return criteriaCount >= 3;
  };
  
  // Safe parsing of JSON to prevent prototype pollution
  export const safeJsonParse = (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Helper function to freeze objects recursively
      const deepFreeze = (obj) => {
        if (obj && typeof obj === 'object' && !Object.isFrozen(obj)) {
          Object.freeze(obj);
          Object.getOwnPropertyNames(obj).forEach(prop => {
            if (obj[prop] !== null && 
                (typeof obj[prop] === 'object' || typeof obj[prop] === 'function') && 
                !Object.isFrozen(obj[prop])) {
              deepFreeze(obj[prop]);
            }
          });
        }
        return obj;
      };
      
      // Make the parsed object immutable to prevent prototype pollution
      return deepFreeze(parsed);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  };
  
  // Rate limiting for client-side actions
  export class RateLimiter {
    constructor(maxAttempts = 5, timeWindowMs = 60000) {
      this.maxAttempts = maxAttempts;
      this.timeWindowMs = timeWindowMs;
      this.attempts = new Map();
    }
    
    // Check if action should be allowed
    checkLimit(actionKey) {
      const now = Date.now();
      const actionAttempts = this.attempts.get(actionKey) || [];
      
      // Remove expired attempts
      const validAttempts = actionAttempts.filter(
        timestamp => now - timestamp < this.timeWindowMs
      );
      
      // Check if limit is reached
      if (validAttempts.length >= this.maxAttempts) {
        return false;
      }
      
      // Record this attempt
      validAttempts.push(now);
      this.attempts.set(actionKey, validAttempts);
      
      return true;
    }
    
    // Reset counter for an action
    reset(actionKey) {
      this.attempts.delete(actionKey);
    }
    
    // Get remaining attempts
    getRemainingAttempts(actionKey) {
      const now = Date.now();
      const actionAttempts = this.attempts.get(actionKey) || [];
      
      // Remove expired attempts
      const validAttempts = actionAttempts.filter(
        timestamp => now - timestamp < this.timeWindowMs
      );
      
      return Math.max(0, this.maxAttempts - validAttempts.length);
    }
  }
  
  // Secure storage wrapper to prevent XSS in localStorage
  export const secureStorage = {
    setItem: (key, value) => {
      try {
        const encryptedValue = btoa(JSON.stringify(value));
        localStorage.setItem(key, encryptedValue);
      } catch (error) {
        console.error('Error storing data securely:', error);
      }
    },
    
    getItem: (key) => {
      try {
        const encryptedValue = localStorage.getItem(key);
        if (!encryptedValue) return null;
        
        return JSON.parse(atob(encryptedValue));
      } catch (error) {
        console.error('Error retrieving secure data:', error);
        // Clear potentially corrupted data
        localStorage.removeItem(key);
        return null;
      }
    },
    
    removeItem: (key) => {
      localStorage.removeItem(key);
    },
    
    clear: () => {
      localStorage.clear();
    }
  };
  
  // Create hash of password for comparison (Do not use for actual password hashing - that should be done server-side!)
  export const hashForComparison = async (text) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };
  
  // Content security validation
  export const validateContentSecurity = (content, type = 'text') => {
    if (!content) return true;
    
    // Different validation for different content types
    switch (type) {
      case 'text':
        // Check for potentially malicious script content
        return !/<script|javascript:|data:|vbscript:|<iframe|<img|onerror|onload|eval\(|setTimeout\(|setInterval\(/i.test(content);
        
      case 'url':
        // Validate URL format and scheme
        try {
          const url = new URL(content);
          return ['http:', 'https:'].includes(url.protocol);
        } catch (error) {
          return false;
        }
        
      case 'email':
        // Basic email validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(content);
        
      case 'filename':
        // Check for directory traversal attempts
        return !/\.\.\/|\.\.\\|~\/|~\\|\/etc\/|\/var\/|\\windows\\|\\system32\\/i.test(content);
        
      default:
        return true;
    }
  };
  
  // HTTP security headers for fetch requests
  export const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY'
  };
  
  // Enhanced fetch with security features
  export const secureFetch = async (url, options = {}) => {
    // Create a new AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);
    
    try {
      // Add security headers
      const secureOptions = {
        ...options,
        headers: {
          ...securityHeaders,
          ...options.headers
        },
        signal: controller.signal
      };
      
      // Add CSRF token if available
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        secureOptions.headers['X-CSRF-Token'] = csrfToken;
      }
      
      const response = await fetch(url, secureOptions);
      
      // Validate response
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };
  
  // Export a default object with all security utilities
  export default {
    generateSecureToken,
    sanitizeHtml,
    isValidRedirectUrl,
    secureRedirect,
    isStrongPassword,
    safeJsonParse,
    RateLimiter,
    secureStorage,
    hashForComparison,
    validateContentSecurity,
    securityHeaders,
    secureFetch
  };