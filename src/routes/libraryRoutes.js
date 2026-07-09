// ============================================
// FILE: src/routes/libraryRoutes.js
// PURPOSE: API route definitions for library
// ============================================

const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const libraryTransactionController = require('../controllers/libraryTransactionController');
const libraryMemberController = require('../controllers/libraryMemberController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// BOOK MANAGEMENT ROUTES
// ============================================

// Get all books
router.get('/books', protect, checkPermission('read:library'), bookController.getBooks);

// Search books
router.get('/books/search', protect, checkPermission('read:library'), bookController.searchBooks);

// Get book by ID
router.get('/books/:id', protect, checkPermission('read:library'), bookController.getBook);

// Create book
router.post('/books', protect, checkPermission('write:library'), bookController.createBook);

// Update book
router.put('/books/:id', protect, checkPermission('write:library'), bookController.updateBook);

// Delete book
router.delete('/books/:id', protect, checkPermission('delete:library'), bookController.deleteBook);

// ============================================
// MEMBER MANAGEMENT ROUTES
// ============================================

// Get all members
router.get('/members', protect, checkPermission('read:library'), libraryMemberController.getMembers);

// Get member by ID
router.get('/members/:id', protect, checkPermission('read:library'), libraryMemberController.getMember);

// Create member
router.post('/members', protect, checkPermission('write:library'), libraryMemberController.createMember);

// Update member
router.put('/members/:id', protect, checkPermission('write:library'), libraryMemberController.updateMember);

// ============================================
// TRANSACTION ROUTES
// ============================================

// Borrow book
router.post('/borrow', protect, checkPermission('write:library'), libraryTransactionController.borrowBook);

// Return book
router.post('/return/:transaction_id', protect, checkPermission('write:library'), libraryTransactionController.returnBook);

// Get member history
router.get('/members/:member_id/history', protect, checkPermission('read:library'), libraryTransactionController.getMemberHistory);

// Get overdue books
router.get('/overdue', protect, checkPermission('read:library'), libraryTransactionController.getOverdueBooks);

// ============================================
// STATISTICS ROUTES
// ============================================

router.get('/stats', protect, checkPermission('read:library'), libraryTransactionController.getLibraryStats);

module.exports = router;