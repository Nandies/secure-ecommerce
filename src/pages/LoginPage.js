import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../utils/auth';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, error, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get return URL from location state or default to home page
  const from = location.state?.from?.pathname || '/';
  
  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);
  
  // Check for expired session parameter
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('session') === 'expired') {
      setErrorMessage('Your session has expired. Please log in again.');
    }
  }, [location]);
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setErrorMessage('');
      
      // Call the login function from auth context
      await login(email, password);
      
      // Redirect to the page the user was trying to access
      navigate(from, { replace: true });
    } catch (err) {
      // Set error message based on the response
      setErrorMessage(
        err.response?.data?.message || 
        'Login failed. Please check your credentials and try again.'
      );
      
      // Log attempt for potential security monitoring
      // In a real app, consider logging to a secure endpoint
      console.error('Failed login attempt:', {
        email,
        timestamp: new Date().toISOString(),
        errorCode: err.response?.status
      });
      
      // Clear password field for security
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle input changes with validation
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
  };
  
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };
  
  // Implement rate limiting on the client side
  // For real security, this should also be implemented on the server
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(null);
  
  useEffect(() => {
    if (loginAttempts >= 5 && !isLocked) {
      setIsLocked(true);
      const timer = setTimeout(() => {
        setIsLocked(false);
        setLoginAttempts(0);
      }, 5 * 60 * 1000); // 5 minutes
      
      setLockTimer(timer);
    }
    
    return () => {
      if (lockTimer) clearTimeout(lockTimer);
    };
  }, [loginAttempts, isLocked]);
  
  return (
    <>
      <Helmet>
        <title>Login - Secure E-Commerce</title>
        <meta name="description" content="Log in to your secure account" />
        {/* Prevent browser from storing login credentials */}
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="login-page">
        <div className="container">
          <div className="form-container">
            <h1>Login to Your Account</h1>
            
            {errorMessage && (
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            )}
            
            {isLocked ? (
              <div className="alert alert-warning">
                <p>Too many failed login attempts. Please try again in 5 minutes.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    className="form-control"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    id="password"
                    className="form-control"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    autoComplete="current-password"
                    minLength="8"
                  />
                </div>
                
                <div className="form-group">
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    disabled={isSubmitting || isLocked}
                  >
                    {isSubmitting ? 'Logging in...' : 'Login'}
                  </button>
                </div>
                
                <div className="form-footer">
                  <p>
                    Don't have an account? <Link to="/register">Register here</Link>
                  </p>
                  <p>
                    <Link to="/forgot-password">Forgot password?</Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;