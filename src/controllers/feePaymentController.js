// ============================================
// FILE: src/controllers/feePaymentController.js
// PURPOSE: Request/Response handlers for fee payments
// ============================================

const feePaymentService = require('../services/feePaymentService');
const AppError = require('../utils/appError');

const feePaymentController = {
    // Process payment
    processPayment: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await feePaymentService.processPayment({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Payment processed successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all payments
    getPayments: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await feePaymentService.getPayments({
                ...req.query,
                campus_id
            });

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get payment by ID
    getPayment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await feePaymentService.getPaymentById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get payments by student
    getPaymentsByStudent: async (req, res, next) => {
        try {
            const { student_id } = req.params;
            const { academic_session_id } = req.query;
            const result = await feePaymentService.getPaymentsByStudent(student_id, academic_session_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get payments by invoice
    getPaymentsByInvoice: async (req, res, next) => {
        try {
            const { invoice_id } = req.params;
            const result = await feePaymentService.getPaymentsByInvoice(invoice_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get student balance
    getStudentBalance: async (req, res, next) => {
        try {
            const { student_id } = req.params;
            const { academic_session_id } = req.query;

            if (!academic_session_id) {
                return next(new AppError('academic_session_id is required', 400));
            }

            const result = await feePaymentService.getStudentBalance(student_id, academic_session_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get payment statistics
    getPaymentStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await feePaymentService.getPaymentStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get daily payment summary
    getDailySummary: async (req, res, next) => {
        try {
            const { date } = req.query;
            const campus_id = req.campusId;

            if (!date) {
                return next(new AppError('date is required (YYYY-MM-DD)', 400));
            }

            const result = await feePaymentService.getDailySummary(date, campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get outstanding fees
    getOutstandingFees: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await feePaymentService.getOutstandingFees(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Refund payment
    refundPayment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { remarks } = req.body;

            const result = await feePaymentService.refundPayment(
                id,
                remarks || 'Refund processed',
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Payment refunded successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = feePaymentController;