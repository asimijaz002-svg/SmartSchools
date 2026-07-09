// ============================================
// FILE: src/routes/studentRoutes.js
// PURPOSE: API route definitions for student management
// ============================================

const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');

const { validateStudent } = require('../middlewares/validationMiddleware');
const { protect, checkPermission } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// ============================================
// DEBUG: Check if controllers are loaded
// ============================================
console.log('--- STUDENT ROUTES INITIALIZED ---');
console.log('getAllStudents:', typeof studentController.getAllStudents);
console.log('getStudentById:', typeof studentController.getStudentById);
console.log('createStudent:', typeof studentController.createStudent);
console.log('updateStudent:', typeof studentController.updateStudent);
console.log('deleteStudent:', typeof studentController.deleteStudent);
console.log('uploadProfilePicture:', typeof studentController.uploadProfilePicture);
console.log('protect:', typeof protect);
console.log('checkPermission:', typeof checkPermission);
console.log('upload:', typeof upload);
console.log('------------------------------------');

// ============================================
// READ Operations (GET)
// ============================================

// Get all students with pagination and filters
router.get(
    '/',
    protect,
    checkPermission('manage:students'), // 🟢 Comma fixed here
    studentController.getAllStudents
);

// Get single student by ID
router.get(
    '/:id',
    protect,
    checkPermission('manage:students'), // 🟢 Semicolon changed to comma here
    studentController.getStudentById
);

// ============================================
// WRITE Operations (POST, PUT, DELETE)
// ============================================

// Create new student
router.post(
    '/',
    protect,
    checkPermission('write:students'),
    validateStudent,
    studentController.createStudent
);

// Update student
router.put(
    '/:id',
    protect,
    checkPermission('write:students'),
    validateStudent,
    studentController.updateStudent
);

// Delete student (soft delete)
router.delete(
    '/:id',
    protect,
    checkPermission('delete:students'),
    studentController.deleteStudent
);

// ============================================
// PROFILE PICTURE UPLOAD
// ============================================

// Upload profile picture
router.patch(
    '/:id/profile-picture',
    protect,
    checkPermission('write:students'),
    upload.single('profile_picture'),
    studentController.uploadProfilePicture
);

module.exports = router;
