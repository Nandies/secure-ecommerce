/**
 * Security configuration for the e-commerce backend
 * This file contains the helmet.js security settings and other security middleware
 */

const helmet = require('helmet');

// Content Security Policy configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // Unsafe-inline needed for styled-components
    imgSrc: ["'self'", "data:"],
    connectSrc: ["'self'", process.env.API_URL || "http://localhost:5000"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: [],
  },
  reportOnly: false
};

// Rate limiting configuration
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many requests from this IP, please try again later'
};

// CORS configuration
const corsConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
    : ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Configure security middleware
const configureSecurityMiddleware = (app) => {
  // Apply Helmet security headers
  app.use(helmet());
  
  // Apply Content-Security-Policy
  app.use(helmet.contentSecurityPolicy(cspConfig));
  
  // Prevent clickjacking
  app.use(helmet.frameguard({ action: 'deny' }));
  
  // Prevent MIME type sniffing
  app.use(helmet.noSniff());
  
  // Set X-XSS-Protection header
  app.use(helmet.xssFilter());
  
  // Hide X-Powered-By header
  app.use(helmet.hidePoweredBy());
  
  // Set Referrer-Policy
  app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
  
  // Set Feature-Policy
  app.use(
    helmet.permittedCrossDomainPolicies({
      permittedPolicies: 'none'
    })
  );
  
  return app;
};

// Function to validate and sanitize input
const sanitizeMiddleware = (req, res, next) => {
  // Add sanitation logic here for request parameters
  
  next();
};

module.exports = {
  cspConfig,
  rateLimitConfig,
  corsConfig,
  configureSecurityMiddleware,
  sanitizeMiddleware
};