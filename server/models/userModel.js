const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false // Don't send password in queries
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // This only works on CREATE and SAVE
      validator: function(el) {
        return el === this.password;
      },
      message: 'Passwords do not match'
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpires: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  },
  lastLogin: Date,
  lastLoginIp: String,
  loginAttempts: {
    type: Number,
    default: 0
  },
  accountLocked: {
    type: Boolean,
    default: false
  },
  lockUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  },
  securityEvents: [
    {
      type: {
        type: String,
        enum: [
          'LOGIN',
          'FAILED_LOGIN',
          'LOGOUT',
          'PASSWORD_CHANGE',
          'PASSWORD_RESET_REQUEST',
          'PASSWORD_RESET',
          'EMAIL_CHANGE',
          'ACCOUNT_LOCK',
          'ACCOUNT_UNLOCK',
          'PROFILE_UPDATE',
          'TWO_FACTOR_SETUP',
          'TWO_FACTOR_DISABLE'
        ]
      },
      date: {
        type: Date,
        default: Date.now
      },
      ip: String,
      userAgent: String,
      details: String
    }
  ],
  addresses: [
    {
      name: String,
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
      phone: String,
      isDefault: {
        type: Boolean,
        default: false
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual property for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Add user's orders virtually (doesn't store in the document)
userSchema.virtual('orders', {
  ref: 'Order',
  foreignField: 'user',
  localField: '_id'
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only run this if password was modified
  if (!this.isModified('password')) return next();
  
  // Hash password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);
  
  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  
  // Update passwordChangedAt property
  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 sec to handle JWT timestamp delays
  }
  
  next();
});

// Pre-save middleware to update email verification status
userSchema.pre('save', function(next) {
  if (this.isModified('email') && !this.isNew) {
    this.emailVerified = false;
  }
  next();
});

// Pre-find middleware to filter out inactive users
userSchema.pre(/^find/, function(next) {
  // this refers to the current query
  this.find({ active: { $ne: false } });
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Instance method to check if password was changed after token issuance
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  
  // False means NOT changed
  return false;
};

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function() {
  // Generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Encrypt token before saving to DB
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  // Set token expiry (10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  
  // Return unencrypted token to send via email
  return resetToken;
};

// Instance method to create email verification token
userSchema.methods.createVerificationToken = function() {
  // Generate random token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  // Encrypt token before saving to DB
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
  
  // Set token expiry (24 hours)
  this.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
  
  // Return unencrypted token to send via email
  return verificationToken;
};

// Instance method to handle failed login attempts
userSchema.methods.handleFailedLogin = async function() {
  // Increment login attempts
  this.loginAttempts += 1;
  
  // Lock account after 5 failed attempts
  if (this.loginAttempts >= 5) {
    this.accountLocked = true;
    this.lockUntil = Date.now() + 30 * 60 * 1000; // Lock for 30 minutes
  }
  
  await this.save({ validateBeforeSave: false });
  
  return this.accountLocked;
};

const User = mongoose.model('User', userSchema);

module.exports = User;