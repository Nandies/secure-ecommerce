const express = require('express');
const rateLimit = require('express-rate-limit');
const productController = require('../controllers/productController');
const authController = require('../controllers/authController');

const router = express.Router();

// Apply rate limiting for public product APIs
const productApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

// Apply rate limiting to search to prevent abuse
const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 searches per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many search requests from this IP, please try again after 5 minutes'
});

// Public routes
router.get('/', productApiLimiter, productController.getAllProducts);
router.get('/:id', productApiLimiter, productController.getProduct);
router.get('/search', searchLimiter, productController.searchProducts);
router.get('/category/:slug', productApiLimiter, productController.getProductsByCategory);

// Protected routes - Admin only
router.use(authController.protect);
router.use(authController.restrictTo('admin'));

router.post('/', productController.createProduct);
router.patch('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;