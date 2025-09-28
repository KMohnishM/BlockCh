const errorHandler = (err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error
  let error = {
    success: false,
    message: 'Internal server error'
  };

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = 'Validation failed';
    error.details = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(error);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    return res.status(401).json(error);
  }

  // Supabase errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique constraint violation
        error.message = 'Duplicate entry found';
        return res.status(409).json(error);
      case '23503': // Foreign key constraint
        error.message = 'Referenced record not found';
        return res.status(400).json(error);
      default:
        error.message = 'Database error';
        return res.status(500).json(error);
    }
  }

  // Custom application errors
  if (err.statusCode) {
    error.message = err.message;
    return res.status(err.statusCode).json(error);
  }

  // Blockchain errors
  if (err.message && err.message.includes('revert')) {
    error.message = 'Blockchain transaction failed';
    error.details = err.message;
    return res.status(400).json(error);
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File size too large';
    return res.status(413).json(error);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'Invalid file type or field name';
    return res.status(400).json(error);
  }

  // Default server error
  return res.status(500).json(error);
};

// Not found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};