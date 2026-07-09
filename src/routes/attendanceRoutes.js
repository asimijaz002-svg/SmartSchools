// ============================================
// FILE: src/routes/attendanceRoutes.js
// PURPOSE: API route definitions for attendance
// ============================================

const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');
const { validateAttendance } = require('../middlewares/validationMiddleware');

// ============================================
// GET Routes - Read Operations
// ============================================

// Get attendance for a class on a specific date
// GET /api/v1/attendance/class/:class_id/date/:attendance_date
router.get(
    '/class/:class_id/date/:attendance_date',
    protect,
    checkPermission('read:attendance'),
    attendanceController.getClassAttendance
);

// Get student attendance report with date range
// GET /api/v1/attendance/student/:student_id/report?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
router.get(
    '/student/:student_id/report',
    protect,
    checkPermission('read:attendance'),
    attendanceController.getStudentReport
);

// Get monthly summary for a class
// GET /api/v1/attendance/class/:class_id/summary?month_year=YYYY-MM-DD
router.get(
    '/class/:class_id/summary',
    protect,
    checkPermission('manage:attendance'), // 🟢 Comma fixed here
    attendanceController.getClassMonthlySummary
);

// ============================================
// POST Routes - Write Operations
// ============================================

// Mark single student attendance
// POST /api/v1/attendance/single
router.post(
    '/single',
    protect,
    checkPermission('write:attendance'),
    validateAttendance,
    attendanceController.markSingle
);

// Bulk mark attendance for a class
// POST /api/v1/attendance/bulk
router.post(
    '/bulk',
    protect,
    checkPermission('write:attendance'),
    attendanceController.markBulk
);

// ============================================
// PUT Routes - Update Operations
// ============================================

// Update attendance record (for correction)
// PUT /api/v1/attendance/:id
router.put(
    '/:id',
    protect,
    checkPermission('write:attendance'),
    attendanceController.updateAttendance
);

module.exports = router;
