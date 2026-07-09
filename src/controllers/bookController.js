// ============================================
// FILE: src/controllers/bookController.js
// PURPOSE: Request/Response handlers for books
// ============================================

const bookService = require('../services/bookService');
const AppError = require('../utils/appError');

const bookController = {
    // Create book
    createBook: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await bookService.createBook({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Book created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all books
    getBooks: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await bookService.getBooks({
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

    // Search books
    searchBooks: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await bookService.searchBooks({
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

    // Get single book
    getBook: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await bookService.getBookById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Update book
    updateBook: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await bookService.updateBook(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Book updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Delete book
    deleteBook: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await bookService.deleteBook(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Book deleted successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = bookController;