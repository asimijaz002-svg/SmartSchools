// ============================================
// FILE: src/routes/transportRoutes.js
// PURPOSE: API route definitions for transport
// ============================================

const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// VEHICLE ROUTES
// ============================================

router.get('/vehicles', protect, checkPermission('read:transport'), transportController.getVehicles);
router.get('/vehicles/:id', protect, checkPermission('read:transport'), transportController.getVehicle);
router.post('/vehicles', protect, checkPermission('write:transport'), transportController.createVehicle);
router.put('/vehicles/:id', protect, checkPermission('write:transport'), transportController.updateVehicle);

// ============================================
// DRIVER ROUTES
// ============================================

router.get('/drivers', protect, checkPermission('read:transport'), transportController.getDrivers);
router.get('/drivers/:id', protect, checkPermission('read:transport'), transportController.getDriver);
router.post('/drivers', protect, checkPermission('write:transport'), transportController.createDriver);
router.put('/drivers/:id', protect, checkPermission('write:transport'), transportController.updateDriver);

// ============================================
// ROUTE ROUTES
// ============================================

router.get('/routes', protect, checkPermission('read:transport'), transportController.getRoutes);
router.get('/routes/:id', protect, checkPermission('read:transport'), transportController.getRoute);
router.post('/routes', protect, checkPermission('write:transport'), transportController.createRoute);
router.put('/routes/:id', protect, checkPermission('write:transport'), transportController.updateRoute);

// ============================================
// STUDENT TRANSPORT ROUTES
// ============================================

router.post('/assign', protect, checkPermission('write:transport'), transportController.assignStudent);
router.get('/student/:student_id', protect, checkPermission('read:transport'), transportController.getStudentTransport);
router.post('/attendance', protect, checkPermission('write:transport'), transportController.markAttendance);

// ============================================
// STATISTICS
// ============================================

router.get('/stats', protect, checkPermission('read:transport'), transportController.getTransportStats);

module.exports = router;