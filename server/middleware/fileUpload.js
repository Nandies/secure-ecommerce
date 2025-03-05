const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { promisify } = require('util');

// Generate secure random filename
const generateSecureFilename = (originalname) => {
  // Get file extension
  const ext = path.extname(originalname).toLowerCase();
  
  // Generate random bytes for filename
  const randomBytes = crypto.randomBytes(16).toString('hex');
  
  // Return secure filename with original extension
  return `${randomBytes}${ext}`;
};

// Validate file type
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  // Get file extension
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    // Accept file
    cb(null, true);
  } else {
    // Reject file
    cb(new Error('Invalid file type. Only JPG, JPEG, PNG, GIF, and WEBP images are allowed.'), false);
  }
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create upload directory if it doesn't exist
    const uploadDir = path.join(__dirname, '../../uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure filename
    const secureFilename = generateSecureFilename(file.originalname);
    cb(null, secureFilename);
  }
});

// Configure upload
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 5 // Max 5 files at once
  }
});

// Middleware for handling single file uploads
const uploadSingle = (fieldName) => {
  return (req, res, next) => {
    const uploadSingleFile = upload.single(fieldName);
    
    uploadSingleFile(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'error',
            message: 'File size exceeds the 5MB limit.'
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            status: 'error',
            message: 'Too many files uploaded.'
          });
        }
        
        return res.status(400).json({
          status: 'error',
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        // Other errors
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      }
      
      // File uploaded successfully
      next();
    });
  };
};

// Middleware for handling multiple file uploads
const uploadMultiple = (fieldName, maxCount) => {
  return (req, res, next) => {
    const uploadMultipleFiles = upload.array(fieldName, maxCount || 5);
    
    uploadMultipleFiles(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        // A Multer error occurred
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'error',
            message: 'File size exceeds the 5MB limit.'
          });
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            status: 'error',
            message: 'Too many files uploaded.'
          });
        }
        
        return res.status(400).json({
          status: 'error',
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        // Other errors
        return res.status(400).json({
          status: 'error',
          message: err.message
        });
      }
      
      // Files uploaded successfully
      next();
    });
  };
};

// Validate uploaded files
const validateUploadedFiles = (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  
  if (files.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'No files uploaded.'
    });
  }
  
  // Additional validation logic can be added here
  
  next();
};

// Delete file from server
const deleteFile = async (filePath) => {
  try {
    const unlink = promisify(fs.unlink);
    await unlink(filePath);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  validateUploadedFiles,
  deleteFile
};