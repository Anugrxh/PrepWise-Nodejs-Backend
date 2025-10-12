// Global error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error("Error Stack:", err.stack);

  // Default error
  let error = {
    success: false,
    message: err.message || "Internal Server Error",
    status: err.status || err.statusCode || 500,
  };

  // Mongoose validation error
  if (err.name === "ValidationError") {
    error.status = 400;
    error.message = "Validation Error";
    error.details = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    error.status = 400;
    error.message = "Duplicate field value";
    const field = Object.keys(err.keyValue)[0];
    error.details = `${field} already exists`;
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === "CastError") {
    error.status = 400;
    error.message = "Invalid ID format";
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.status = 401;
    error.message = "Invalid token";
  }

  if (err.name === "TokenExpiredError") {
    error.status = 401;
    error.message = "Token expired";
  }

  // Multer errors (file upload)
  if (err.code === "LIMIT_FILE_SIZE") {
    error.status = 400;
    error.message = "File too large";
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    error.status = 400;
    error.message = "Too many files";
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    error.status = 400;
    error.message = "Unexpected file field";
  }

  // VAPI errors
  if (err.message && err.message.includes("VAPI")) {
    error.status = 500;
    error.message = "Voice AI service error";
  }

  // Google AI errors
  if (
    err.message &&
    (err.message.includes("Google") || err.message.includes("Gemini"))
  ) {
    error.status = 500;
    error.message = "AI service error";
  }

  // MongoDB connection errors
  if (err.name === "MongoNetworkError" || err.name === "MongoTimeoutError") {
    error.status = 500;
    error.message = "Database connection error";
  }

  // Rate limit errors
  if (err.status === 429) {
    error.message = "Too many requests, please try again later";
  }

  // CORS errors
  if (err.message && err.message.includes("CORS")) {
    error.status = 403;
    error.message = "CORS policy violation";
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === "production") {
    // Remove stack trace and sensitive info
    delete error.stack;

    // Generic message for 500 errors in production
    if (error.status === 500) {
      error.message = "Something went wrong on our end";
    }
  } else {
    // Include stack trace in development
    error.stack = err.stack;
    error.originalError = err.message;
  }

  // Log error for monitoring
  if (error.status >= 500) {
    console.error("Server Error:", {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?._id,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(error.status).json(error);
};

// Async error handler wrapper
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
