const jwt = require('jsonwebtoken');
const AppError = require('../utils/appError');
const userRepository = require('../repositories/userRepository');  // 👈 ADD THIS

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
    'read:reports',
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
    'read:reports',
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
    'read:reports',
    'read:dashboard'
  ],
  accountant: [
    'read:students',
    'read:fees',
    'write:fees',
    'read:reports'
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

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('You are not logged in! Please log in to get access.', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 DECODED TOKEN:', decoded);  // 👈 DEBUG
    
    const user = await userRepository.findById(decoded.id);
    console.log('🔍 USER FROM DB:', user);  // 👈 DEBUG
    
    if (!user) {
      return next(new AppError('The account belonging to this token no longer exists.', 401));
    }
    
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };
    
    console.log('🔍 req.user AFTER SET:', req.user);  // 👈 DEBUG
    
    next();
  } catch (error) {
    console.log('🔍 ERROR in protect:', error.message);  // 👈 DEBUG
    return next(new AppError('Invalid token or session expired.', 401));
  }
};

const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    console.log('🔍 checkPermission called with:', requiredPermission);  // 👈 DEBUG
    console.log('🔍 req.user in checkPermission:', req.user);  // 👈 DEBUG
    
    if (!req.user || !req.user.role) {
      return next(new AppError('Authentication required before checking permissions.', 401));
    }

    const userPermissions = rolePermissions[req.user.role] || [];
    console.log('🔍 userPermissions for role:', req.user.role, userPermissions);  // 👈 DEBUG
    console.log('🔍 Has permission?', userPermissions.includes(requiredPermission));  // 👈 DEBUG

    if (!userPermissions.includes(requiredPermission)) {
      return next(new AppError('Permission Denied. You do not have the required access privileges for this action.', 403));
    }

    next();
  };
};

module.exports = { protect, checkPermission };