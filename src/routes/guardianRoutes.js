// ============================================
// FILE: src/routes/guardianRoutes.js
// PURPOSE: API route definitions for student guardians
// ============================================

const express = require('express');
const router = express.Router();
const guardianController = require('../controllers/guardianController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// READ Operations
// ============================================

// Get all guardians for a student
router.get(
    '/student/:student_id',
    protect,
    checkPermission('read:students'),
    guardianController.getGuardiansByStudent
);

// Get single guardian by ID
router.get(
    '/:id',
    protect,
    checkPermission('read:students'),
    guardianController.getGuardianById
);

// Get guardian types (for dropdown)
router.get(
    '/types/list',
    protect,
    checkPermission('read:students'),
    guardianController.getGuardianTypes
);

// ============================================
// WRITE Operations
// ============================================

// Create new guardian
router.post(
    '/',
    protect,
    checkPermission('write:students'),
    guardianController.createGuardian
);

// Update guardian
router.put(
    '/:id',
    protect,
    checkPermission('write:students'),
    guardianController.updateGuardian
);

// Delete guardian
router.delete(
    '/:id',
    protect,
    checkPermission('write:students'),
    guardianController.deleteGuardian
);

module.exports = router;