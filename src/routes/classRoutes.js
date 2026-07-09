// ============================================
// FILE: src/routes/classRoutes.js
// PURPOSE: API route definitions for classes
// ============================================

const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// READ Operations
// ============================================

// Get all classes (with pagination)
router.get(
    '/',
    protect,
    checkPermission('read:students'),
    classController.getClasses
);

// Get classes with student counts (for reporting)
router.get(
    '/with-counts',
    protect,
    checkPermission('read:students'),
    classController.getClassesWithCounts
);

// Get single class by ID
router.get(
    '/:id',
    protect,
    checkPermission('read:students'),
    classController.getClass
);

// ============================================
// WRITE Operations
// ============================================

// Create new class
router.post(
    '/',
    protect,
    checkPermission('write:students'),
    classController.createClass
);

// Update class
router.put(
    '/:id',
    protect,
    checkPermission('write:students'),
    classController.updateClass
);

// Delete class
router.delete(
    '/:id',
    protect,
    checkPermission('delete:students'),
    classController.deleteClass
);

module.exports = router;