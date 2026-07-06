const AppError = require('../utils/appError');

const validateStudent = (req, res, next) => {
  const { roll_no, first_name, last_name, email, class_name } = req.body;

  // 1. Check required fields for registration (POST requests)
  if (req.method === 'POST') {
    if (!roll_no || !first_name || !last_name || !class_name) {
      return next(new AppError('Missing required fields: roll_no, first_name, last_name, and class_name are mandatory.', 400));
    }
  }

  // 2. Validate email format (if email is provided)
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email address format (e.g., user@domain.com).', 400));
    }
  }

  // 3. Prevent SQL overflows by checking field lengths (Security Standard)
  if (first_name && first_name.length > 100) {
    return next(new AppError('First name cannot exceed 100 characters.', 400));
  }
  if (last_name && last_name.length > 100) {
    return next(new AppError('Last name cannot exceed 100 characters.', 400));
  }
  if (roll_no && roll_no.length > 50) {
    return next(new AppError('Roll number cannot exceed 50 characters.', 400));
  }

  next(); // Data is valid, proceed to the controller!
};

module.exports = { validateStudent };