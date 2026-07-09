// ============================================
// FILE: src/routes/feePaymentRoutes.js
// PURPOSE: API route definitions for fee payments
// ============================================

const express = require('express');
const router = express.Router();
const feePaymentController = require('../controllers/feePaymentController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// READ Operations
// ============================================

// Get all payments
router.get(
    '/',
    protect,
    checkPermission('read:fees'),
    feePaymentController.getPayments
);

// Get payment statistics
router.get(
    '/stats',
    protect,
    checkPermission('read:fees'),
    feePaymentController.getPaymentStats
);

// Get daily summary
router.get(
    '/daily-summary',
    protect,
    checkPermission('read:fees'),
    feePaymentController.getDailySummary
);

// Get outstanding fees
router.get(
    '/outstanding',
    protect,
    checkPermission('read:fees'),
    feePaymentController.getOutstandingFees
);

// Get payments by student
router.get(
    '/student/:student_id',
    protect,
    checkPermission('read:fees'),
    feePaymentController.getPaymentsByStudent
);

// Get payments by invoice
router.get(
    '/invoice/:invoice_id',
    protect,
    checkPermission('read:fees'),
    feePaymentController.getPaymentsByInvoice
);

// Get student balance
router.get(
    '/balance/:student_id',
    protect,
    checkPermission('read:fees'),
    feePaymentController.getStudentBalance
);

// Get single payment
router.get(
    '/:id',
    protect,
    checkPermission('read:fees'),
    feePaymentController.getPayment
);

// ============================================
// WRITE Operations
// ============================================

// Process payment
router.post(
    '/',
    protect,
    checkPermission('write:fees'),
    feePaymentController.processPayment
);

// Refund payment
router.patch(
    '/:id/refund',
    protect,
    checkPermission('write:fees'),
    feePaymentController.refundPayment
);

module.exports = router;