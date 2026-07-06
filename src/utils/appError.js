class AppError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode;
      // Operational errors are predictable user-made errors (e.g., duplicate roll numbers)
      this.isOperational = true; 
  
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = AppError;