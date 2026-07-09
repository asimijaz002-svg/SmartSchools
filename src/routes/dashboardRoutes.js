// ============================================
// FILE: src/routes/dashboardRoutes.js
// PURPOSE: API route definitions for dashboard
// ============================================

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// Admin Dashboard
router.get(
    '/admin',
    protect,
    checkPermission('read:dashboard'),
    dashboardController.getAdminDashboard
);

// Teacher Dashboard
router.get(
    '/teacher',
    protect,
    checkPermission('read:dashboard'),
    dashboardController.getTeacherDashboard
);

// Parent Dashboard
router.get(
    '/parent/:student_id',
    protect,
    checkPermission('read:dashboard'),
    dashboardController.getParentDashboard
);

module.exports = router;