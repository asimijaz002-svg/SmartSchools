const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const userRepository = require('../repositories/userRepository');

// 1. JWT Security Token Verification Middleware
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Access denied. No authentication token provided.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const currentUser = await userRepository.findById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The account belonging to this security token has been deactivated.', 401));
    }

    req.user = currentUser;
    next();

  } catch (error) {
    return next(new AppError('Invalid or expired authentication token. Please login again.', 401));
  }
};

// 2. Granular, Module-Based Permissions Matrix (Enterprise Standard)
const rolePermissions = {
  staff: [
    'read:students'
  ],
  teacher: [
    'read:students', 
    'write:grades'
  ],
  accountant: [
    'read:students', 
    'write:fees'
  ],
  admin: [
    'read:students', 
    'write:students', 
    'delete:students', 
    'write:fees', 
    'write:grades'
  ]
};

// 3. Authorization Check Middleware
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    // Confirm the protect middleware ran first
    if (!req.user) {
      return next(new AppError('Authentication required before checking permissions.', 401));
    }

    const userPermissions = rolePermissions[req.user.role] || [];

    // Check if the user's role has the required granular permission
    if (!userPermissions.includes(requiredPermission)) {
      return next(new AppError('Permission Denied. You do not have the required access privileges for this action.', 403)); // 403 Forbidden
    }

    next(); // Permission approved, proceed!
  };
};

module.exports = { protect, checkPermission };