/**
 * Form validation utilities for secure input handling
 */

// Regular expressions for validation
const VALIDATION_PATTERNS = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/,
    name: /^[a-zA-Z0-9\s'-]{2,50}$/,
    phone: /^\+?[0-9]{10,15}$/,
    zip: /^[0-9]{5}(-[0-9]{4})?$/,
    creditCard: /^[0-9]{13,19}$/,
    cvv: /^[0-9]{3,4}$/,
    url: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
  };
  
  // Error messages for validation failures
  const ERROR_MESSAGES = {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    password: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character',
    passwordMatch: 'Passwords do not match',
    name: 'Please enter a valid name (2-50 characters)',
    phone: 'Please enter a valid phone number',
    zip: 'Please enter a valid zip code',
    creditCard: 'Please enter a valid credit card number',
    cvv: 'Please enter a valid CVV code',
    url: 'Please enter a valid URL',
    minLength: (min) => `Must be at least ${min} characters`,
    maxLength: (max) => `Must be no more than ${max} characters`
  };
  
  // Validate a single field
  const validateField = (name, value, rules = {}, formValues = {}) => {
    // Skip validation if field is not required and value is empty
    if (!rules.required && (value === '' || value === null || value === undefined)) {
      return '';
    }
  
    // Required check
    if (rules.required && (value === '' || value === null || value === undefined)) {
      return ERROR_MESSAGES.required;
    }
  
    // Type-specific validation
    if (rules.type && VALIDATION_PATTERNS[rules.type]) {
      if (!VALIDATION_PATTERNS[rules.type].test(value)) {
        return ERROR_MESSAGES[rules.type];
      }
    }
  
    // Min length check
    if (rules.minLength && value.length < rules.minLength) {
      return ERROR_MESSAGES.minLength(rules.minLength);
    }
  
    // Max length check
    if (rules.maxLength && value.length > rules.maxLength) {
      return ERROR_MESSAGES.maxLength(rules.maxLength);
    }
  
    // Match other field (like confirm password)
    if (rules.match && formValues[rules.match] !== value) {
      return ERROR_MESSAGES.passwordMatch;
    }
  
    // Custom validation
    if (rules.validate && typeof rules.validate === 'function') {
      const customError = rules.validate(value, formValues);
      if (customError) {
        return customError;
      }
    }
  
    // If all validations pass
    return '';
  };
  
  // Validate entire form
  const validateForm = (formValues, validationSchema) => {
    const errors = {};
    let isValid = true;
  
    Object.keys(validationSchema).forEach(fieldName => {
      const rules = validationSchema[fieldName];
      const value = formValues[fieldName];
      
      const error = validateField(fieldName, value, rules, formValues);
      
      if (error) {
        errors[fieldName] = error;
        isValid = false;
      }
    });
  
    return { isValid, errors };
  };
  
  // Sanitize form input to prevent XSS
  const sanitizeFormData = (formData) => {
    const sanitized = {};
    
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      
      if (typeof value === 'string') {
        // Basic sanitization for strings
        sanitized[key] = value
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      } else {
        // Keep non-string values as is
        sanitized[key] = value;
      }
    });
    
    return sanitized;
  };
  
  // Credit card validation with Luhn algorithm
  const validateCreditCard = (cardNumber) => {
    // Remove non-digit characters
    const digitsOnly = cardNumber.replace(/\D/g, '');
    
    if (digitsOnly.length < 13 || digitsOnly.length > 19) {
      return false;
    }
    
    // Luhn algorithm implementation
    let sum = 0;
    let shouldDouble = false;
    
    // Loop from right to left
    for (let i = digitsOnly.length - 1; i >= 0; i--) {
      let digit = parseInt(digitsOnly.charAt(i));
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return (sum % 10) === 0;
  };
  
  // Debounce function for handling input validation
  const debounce = (func, wait) => {
    let timeout;
    
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };
  
  // Export all utilities
  export {
    VALIDATION_PATTERNS,
    ERROR_MESSAGES,
    validateField,
    validateForm,
    sanitizeFormData,
    validateCreditCard,
    debounce
  };
  
  // Default export
  export default {
    validate: validateForm,
    validateField,
    sanitize: sanitizeFormData
  };