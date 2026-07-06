const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
  
    // 1. If it's a 500 System Error (e.g., MySQL syntax crash, server down)
    if (err.statusCode === 500) {
      // Log the detailed error on the server terminal so developers can debug it
      console.error('🔥 SYSTEM ERROR OCCURRED:', err);
  
      // Send a generic, non-revealing response to the client
      return res.status(500).json({
        success: false,
        message: 'Something went wrong on our end. Please try again later.'
      });
    }
  
    // 2. If it's an expected Operational Error (e.g., AppError like a validation failure)
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  };
  
  module.exports = errorMiddleware;