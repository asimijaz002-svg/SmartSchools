// ============================================
// FILE: src/routes/reportRoutes.js
// ============================================

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// Get available report types
router.get(
    '/types',
    protect,
    checkPermission('read:reports'),
    reportController.getReportTypes
);

// Generate specific report
router.get(
    '/:reportType',
    protect,
    checkPermission('read:reports'),
    reportController.generateReport
);

module.exports = router;