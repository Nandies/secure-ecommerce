import React, { createContext, useContext, useState, useEffect } from 'react';
import { secureApiClient } from './apiClient';

// Create a context for authentication
const AuthContext = createContext();

// Provider component to wrap the app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if user is already logged in (from token in localStorage)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (token) {
          // Validate token with the server
          const response = await secureApiClient.get('/auth/validate-token');
          setUser(response.data.user);
        }
      } catch (err) {
        // Invalid or expired token
        localStorage.removeItem('auth_token');
        setUser(null);
        setError('Session expired. Please log in again.');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Send login request
      const response = await secureApiClient.post('/auth/login', {
        email,
        password
      });
      
      // Store token securely
      const { token, user } = response.data;
      localStorage.setItem('auth_token', token);
      
      // Update state
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Register function
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Send registration request
      const response = await secureApiClient.post('/auth/register', userData);
      
      // Automatically log in after registration
      const { token, user } = response.data;
      localStorage.setItem('auth_token', token);
      
      // Update state
      setUser(user);
      return user;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      await secureApiClient.post('/auth/logout');
    } catch (err) {
      // Continue with logout even if server request fails
      console.error('Logout error:', err);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };
  
  // Check if user is authenticated
  const isAuthenticated = !!user;
  
  // Context value
  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};