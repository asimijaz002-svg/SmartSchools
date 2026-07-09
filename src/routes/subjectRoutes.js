// ============================================
// FILE: src/routes/subjectRoutes.js
// PURPOSE: API route definitions for subjects
// ============================================

const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// READ Operations
// ============================================

// Get all subjects (with pagination and filters)
router.get(
    '/',
    protect,
    checkPermission('read:students'),
    subjectController.getSubjects
);

// Get subject groups (for dropdown)
router.get(
    '/groups',
    protect,
    checkPermission('read:students'),
    subjectController.getSubjectGroups
);

// Get education levels (for dropdown)
router.get(
    '/education-levels',
    protect,
    checkPermission('read:students'),
    subjectController.getEducationLevels
);

// Get subject statistics
router.get(
    '/stats',
    protect,
    checkPermission('read:students'),
    subjectController.getSubjectStats
);

// Get subjects by education level
router.get(
    '/level/:education_level',
    protect,
    checkPermission('read:students'),
    subjectController.getSubjectsByLevel
);

// Get subjects by class
router.get(
    '/class/:class_id',
    protect,
    checkPermission('read:students'),
    subjectController.getSubjectsByClass
);

// Get single subject
router.get(
    '/:id',
    protect,
    checkPermission('read:students'),
    subjectController.getSubject
);

// ============================================
// WRITE Operations
// ============================================

// Create new subject
router.post(
    '/',
    protect,
    checkPermission('write:students'),
    subjectController.createSubject
);

// Update subject
router.put(
    '/:id',
    protect,
    checkPermission('write:students'),
    subjectController.updateSubject
);

// Delete subject
router.delete(
    '/:id',
    protect,
    checkPermission('delete:students'),
    subjectController.deleteSubject
);

// ============================================
// CLASS LINKING Operations
// ============================================

// Link subject to class
router.post(
    '/:subject_id/class/:class_id/link',
    protect,
    checkPermission('write:students'),
    subjectController.linkToClass
);

// Unlink subject from class
router.delete(
    '/:subject_id/class/:class_id/unlink',
    protect,
    checkPermission('write:students'),
    subjectController.unlinkFromClass
);

module.exports = router;