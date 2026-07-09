const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError'); // Agar appError ka path mukhtalif hai to check karlein

const rolePermissions = {
  super_admin: [
    'manage:schools',
    'manage:admins',
    'read:settings',
    'write:settings',
    'delete:settings',
    'read:students',
    'write:students',
    'delete:students',
    'read:attendance',
    'write:attendance',
    'read:fees',
    'write:fees',
    'read:employees',
    'write:employees',
    'delete:employees',
    'read:exams',
    'write:exams',
    'delete:exams',
    'read:library',
    'write:library',
    'delete:library',
    'read:transport',
    'write:transport',
    'delete:transport',
    'read:inventory',
    'write:inventory',
    'delete:inventory',
    'read:reports',      // 👈 ADD THIS
    'read:dashboard'
  ],
  admin: [
    'read:students',
    'write:students',
    'delete:students',
    'write:fees',
    'write:grades',
    'read:attendance',
    'write:attendance',
    'read:settings',
    'write:settings',
    'delete:settings',
    'read:fees',
    'write:fees',
    'read:employees',
    'write:employees',
    'delete:employees',
    'read:exams',
    'write:exams',
    'delete:exams',
    'read:library',
    'write:library',
    'delete:library',
    'read:transport',
    'write:transport',
    'delete:transport',
    'read:inventory',
    'write:inventory',
    'delete:inventory',
    'read:reports',      // 👈 ADD THIS
    'read:dashboard'
  ],
  teacher: [
    'read:students',
    'write:grades',
    'read:attendance',
    'write:attendance',
    'read:exams',
    'write:exams',
    'read:library',
    'write:library',
    'read:reports',      // 👈 ADD THIS
    'read:dashboard'
  ],
  accountant: [
    'read:students',
    'read:fees',
    'write:fees',
    'read:reports'       // 👈 ADD THIS
  ],
  staff: [
    'read:students'
  ],
  student: [
    'read:profile'
  ],
  parent: [
    'read:dashboard'
  ]
};

// 1. Protect Middleware Definition
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1]; // [1] to extract the actual token string
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (error) {
    return next(new AppError('Invalid token or session expired.', 401));
  }
};

// 2. CheckPermission Middleware Definition (Standard function layout)
const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    const userPermissions = rolePermissions[req.user.role] || [];

    if (!userPermissions.includes(requiredPermission)) {
      return next(new AppError('Permission Denied. You do not have the required access privileges for this action.', 403));
    }

    next();
  };
};

// 3. Exporting both named functions correctly
module.exports = { 
  protect, 
  checkPermission 
};
