// ============================================
// FILE: src/controllers/libraryTransactionController.js
// PURPOSE: Request/Response handlers for library transactions
// ============================================

const libraryService = require('../services/libraryService');
const AppError = require('../utils/appError');

const libraryTransactionController = {
    // Borrow book
    borrowBook: async (req, res, next) => {
        try {
            const result = await libraryService.borrowBook(
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(201).json({
                success: true,
                message: 'Book borrowed successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Return book
    returnBook: async (req, res, next) => {
        try {
            const { transaction_id } = req.params;
            const result = await libraryService.returnBook(
                transaction_id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Book returned successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get member history
    getMemberHistory: async (req, res, next) => {
        try {
            const { member_id } = req.params;
            const result = await libraryService.getMemberHistory(member_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get overdue books
    getOverdueBooks: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await libraryService.getOverdueBooks(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get library statistics
    getLibraryStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await libraryService.getLibraryStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = libraryTransactionController;