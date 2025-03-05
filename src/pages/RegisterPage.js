import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '../utils/auth';

const RegisterPage = () => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // UI state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  // If already authenticated, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear specific error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
    
    // Check password strength if password field is changing
    if (name === 'password') {
      calculatePasswordStrength(value);
    }
  };
  
  // Password strength calculator
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) strength += 1;  // Has uppercase
    if (/[a-z]/.test(password)) strength += 1;  // Has lowercase
    if (/[0-9]/.test(password)) strength += 1;  // Has number
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;  // Has special char
    
    setPasswordStrength(strength);
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength < 3) {
      newErrors.password = 'Password is too weak';
    }
    
    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const isValid = validateForm();
    if (!isValid) return;
    
    try {
      setIsSubmitting(true);
      
      // Call register function from auth context
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      // Redirect to home page after successful registration
      navigate('/');
    } catch (err) {
      // Handle specific error responses from the API
      if (err.response && err.response.data) {
        const apiErrors = err.response.data.errors;
        
        if (apiErrors) {
          // Map API errors to form fields
          const formattedErrors = {};
          
          Object.keys(apiErrors).forEach(key => {
            formattedErrors[key] = apiErrors[key];
          });
          
          setErrors(formattedErrors);
        } else if (err.response.data.message) {
          // General error message
          setErrors({ general: err.response.data.message });
        }
      } else {
        // Fallback error message
        setErrors({ general: 'Registration failed. Please try again later.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render password strength indicator
  const renderPasswordStrength = () => {
    const strengthText = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong', 'Excellent'];
    const strengthClass = [
      'password-strength-weak',
      'password-strength-fair',
      'password-strength-good', 
      'password-strength-strong',
      'password-strength-very-strong',
      'password-strength-excellent'
    ];
    
    return (
      <div className="password-strength-meter">
        <div className={`password-strength-indicator ${strengthClass[passwordStrength]}`}>
          <div 
            className="password-strength-fill" 
            style={{ width: `${(passwordStrength / 6) * 100}%` }}
          ></div>
        </div>
        <span className="password-strength-text">
          {formData.password ? strengthText[passwordStrength] : ''}
        </span>
      </div>
    );
  };
  
  return (
    <>
      <Helmet>
        <title>Register - Secure E-Commerce</title>
        <meta name="description" content="Create a new secure account" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="register-page">
        <div className="container">
          <div className="form-container">
            <h1>Create an Account</h1>
            
            {errors.general && (
              <div className="alert alert-danger" role="alert">
                {errors.general}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name" className="form-label">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                  value={formData.name}
                  onChange={handleChange}
                  required
                  autoFocus
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                  value={formData.password}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                  minLength="8"
                />
                {renderPasswordStrength()}
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                <small className="form-text text-muted">
                  Password must be at least 8 characters and include uppercase, lowercase, 
                  numbers, and special characters.
                </small>
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  autoComplete="new-password"
                />
                {errors.confirmPassword && (
                  <div className="invalid-feedback">{errors.confirmPassword}</div>
                )}
              </div>
              
              <div className="form-group">
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating Account...' : 'Register'}
                </button>
              </div>
              
              <div className="form-footer">
                <p>
                  Already have an account? <Link to="/login">Login here</Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;