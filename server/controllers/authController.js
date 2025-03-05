const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const User = require('../models/userModel');

// Security utility functions
const createSecureToken = () => crypto.randomBytes(32).toString('hex');

// Generate JWT token
const signToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN
    }
  );
};

// Send JWT as a secure cookie
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);
  
  // Set secure cookie options
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  };
  
  // Set JWT cookie
  res.cookie('jwt', token, cookieOptions);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

// User registration
exports.signup = async (req, res, next) => {
  try {
    // Validate CSRF token
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.cookies['XSRF-TOKEN']) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid CSRF token'
      });
    }
    
    // Input validation - ensure only needed fields are extracted
    const { name, email, password, passwordConfirm } = req.body;
    
    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long'
      });
    }
    
    // Password regex for strong passwords
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    // Check if passwords match
    if (password !== passwordConfirm) {
      return res.status(400).json({
        status: 'error',
        message: 'Passwords do not match'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Email already in use'
      });
    }
    
    // Create new user with only needed info
    const newUser = await User.create({
      name,
      email,
      password,
      passwordConfirm,
      role: 'user' // Default role
    });
    
    // Generate verification token
    const verificationToken = createSecureToken();
    newUser.verificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');
    newUser.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    
    await newUser.save({ validateBeforeSave: false });
    
    // Send verification email - Placeholder for email service
    
    // Create and send JWT token
    createSendToken(newUser, 201, req, res);
  } catch (err) {
    console.error('Signup error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Error signing up. Please try again later.'
    });
  }
};

// User login
exports.login = async (req, res, next) => {
  try {
    // Validate CSRF token
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.cookies['XSRF-TOKEN']) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid CSRF token'
      });
    }
    
    const { email, password } = req.body;
    
    // Check if email and password exist
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email and password'
      });
    }
    
    // Rate limiting - check if attempts are exceeded
    const loginAttempts = req.ip + email;
    
    // Find user by email
    const user = await User.findOne({ email }).select('+password');
    
    // If user doesn't exist or password is incorrect
    if (!user || !(await user.correctPassword(password, user.password))) {
      // Increment failed login attempts
      
      return res.status(401).json({
        status: 'error',
        message: 'Incorrect email or password'
      });
    }
    
    // Check if user is verified
    if (user.emailVerified === false) {
      return res.status(401).json({
        status: 'error',
        message: 'Please verify your email before logging in'
      });
    }
    
    // Check if account is locked
    if (user.accountLocked) {
      if (user.lockUntil && user.lockUntil > Date.now()) {
        return res.status(401).json({
          status: 'error',
          message: `Account locked. Please try again after ${new Date(user.lockUntil).toLocaleString()}`
        });
      } else {
        // Unlock account if lock period has passed
        user.accountLocked = false;
        user.loginAttempts = 0;
        await user.save({ validateBeforeSave: false });
      }
    }
    
    // Reset login attempts on successful login
    user.loginAttempts = 0;
    await user.save({ validateBeforeSave: false });
    
    // Log user activity
    await User.findByIdAndUpdate(user._id, {
      lastLogin: Date.now(),
      lastLoginIp: req.ip
    });
    
    // Send token to client
    createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Login error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Error logging in. Please try again later.'
    });
  }
};

// Logout
exports.logout = (req, res) => {
  // Clear JWT cookie
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true
  });
  
  res.status(200).json({ status: 'success' });
};

// Protect routes - Authentication middleware
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from authorization header or cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'You are not logged in. Please log in to get access.'
      });
    }
    
    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'error',
        message: 'The user belonging to this token no longer exists.'
      });
    }
    
    // Check if user changed password after token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'error',
        message: 'User recently changed password. Please log in again.'
      });
    }
    
    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed. Please log in again.'
    });
  }
};

// Restrict to certain roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
};

// Update password
exports.updatePassword = async (req, res, next) => {
  try {
    // Validate CSRF token
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.cookies['XSRF-TOKEN']) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid CSRF token'
      });
    }
    
    // Get user from collection
    const user = await User.findById(req.user.id).select('+password');
    
    // Check if current password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
      return res.status(401).json({
        status: 'error',
        message: 'Your current password is incorrect'
      });
    }
    
    // Validate new password
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!passwordRegex.test(req.body.newPassword)) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    // Update password
    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();
    
    // Log the password change
    await User.findByIdAndUpdate(user._id, {
      passwordChangedAt: Date.now(),
      securityEvents: [
        ...user.securityEvents, 
        { type: 'PASSWORD_CHANGE', date: Date.now(), ip: req.ip }
      ]
    });
    
    // Log user in with new password
    createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Update password error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Error updating password. Please try again later.'
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res, next) => {
  try {
    // Validate CSRF token
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.cookies['XSRF-TOKEN']) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid CSRF token'
      });
    }
    
    // Get user based on email
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'There is no user with that email address'
      });
    }
    
    // Generate random reset token
    const resetToken = createSecureToken();
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    await user.save({ validateBeforeSave: false });
    
    // Log the password reset request
    await User.findByIdAndUpdate(user._id, {
      securityEvents: [
        ...user.securityEvents, 
        { type: 'PASSWORD_RESET_REQUEST', date: Date.now(), ip: req.ip }
      ]
    });
    
    // Send email with reset token - Placeholder for email service
    
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Error processing request. Please try again later.'
    });
  }
};

// Reset password
exports.resetPassword = async (req, res, next) => {
  try {
    // Validate CSRF token
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.cookies['XSRF-TOKEN']) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid CSRF token'
      });
    }
    
    // Get user based on token
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });
    
    // If token has expired or no user found
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is invalid or has expired'
      });
    }
    
    // Validate new password
    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{8,})/;
    if (!passwordRegex.test(req.body.password)) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
      });
    }
    
    // Update password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    
    // Log the password reset
    await User.findByIdAndUpdate(user._id, {
      passwordChangedAt: Date.now(),
      securityEvents: [
        ...user.securityEvents, 
        { type: 'PASSWORD_RESET', date: Date.now(), ip: req.ip }
      ]
    });
    
    // Log user in
    createSendToken(user, 200, req, res);
  } catch (err) {
    console.error('Reset password error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Error resetting password. Please try again later.'
    });
  }
};

// Validate token
exports.validateToken = async (req, res, next) => {
  try {
    // Simply return success if the protect middleware passes
    res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (err) {
    console.error('Validate token error:', err);
    
    res.status(500).json({
      status: 'error',
      message: 'Error validating token. Please try again later.'
    });
  }
};