const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Load security config
const { 
  configureSecurityMiddleware, 
  corsConfig, 
  rateLimitConfig 
} = require('./config/security');

// Initialize Express
const app = express();

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Set up request logging with Morgan
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'), 
  { flags: 'a' }
);

// Log all requests in production
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev')); // Concise output for development
}

// Apply security middleware
configureSecurityMiddleware(app);

// Set up CORS
app.use(cors(corsConfig));

// Rate limiting to prevent brute force attacks
const limiter = rateLimit(rateLimitConfig);
app.use('/api/auth', limiter); // Apply rate limiting to auth routes

// Body parsers
app.use(express.json({ limit: '10kb' })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser for secure cookies
app.use(cookieParser(process.env.COOKIE_SECRET));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP Parameter Pollution
app.use(hpp());

// Compression for better performance
app.use(compression());

// Set secure headers for all responses
app.use((req, res, next) => {
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Feature-Policy', "camera 'none'; microphone 'none'; geolocation 'none'");
  next();
});

// Store CSRF token in cookie for SPA
app.use((req, res, next) => {
  const csrfToken = require('crypto').randomBytes(16).toString('hex');
  res.cookie('XSRF-TOKEN', csrfToken, {
    httpOnly: false, // Needs to be accessible from JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  next();
});

// API Routes (to be added)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Hide error details in production
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500 
    ? 'Internal Server Error' 
    : err.message;
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  // Any routes not picked up by the server will be handled by React Router
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

module.exports = app;