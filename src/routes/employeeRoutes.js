// ============================================
// FILE: src/routes/employeeRoutes.js
// PURPOSE: API route definitions for employees
// ============================================

const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// READ Operations
// ============================================

// Get all employees (with pagination and filters)
router.get(
    '/',
    protect,
    checkPermission('read:employees'),
    employeeController.getEmployees
);

// Get teachers (for dropdown)
router.get(
    '/teachers',
    protect,
    checkPermission('read:employees'),
    employeeController.getTeachers
);

// Get employees by department
router.get(
    '/department/:department_id',
    protect,
    checkPermission('read:employees'),
    employeeController.getByDepartment
);

// Get employees by designation
router.get(
    '/designation/:designation_id',
    protect,
    checkPermission('read:employees'),
    employeeController.getByDesignation
);

// Get employee statistics
router.get(
    '/stats',
    protect,
    checkPermission('read:employees'),
    employeeController.getEmployeeStats
);

// Get single employee
router.get(
    '/:id',
    protect,
    checkPermission('read:employees'),
    employeeController.getEmployee
);

// ============================================
// WRITE Operations
// ============================================

// Create new employee
router.post(
    '/',
    protect,
    checkPermission('write:employees'),
    employeeController.createEmployee
);

// Update employee
router.put(
    '/:id',
    protect,
    checkPermission('write:employees'),
    employeeController.updateEmployee
);

// Delete employee
router.delete(
    '/:id',
    protect,
    checkPermission('delete:employees'),
    employeeController.deleteEmployee
);

module.exports = router;