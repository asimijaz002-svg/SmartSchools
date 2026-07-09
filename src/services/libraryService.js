// ============================================
// FILE: src/services/libraryService.js
// PURPOSE: Business logic for library operations
// ============================================

const bookRepository = require('../repositories/bookRepository');
const libraryMemberRepository = require('../repositories/libraryMemberRepository');
const libraryTransactionRepository = require('../repositories/libraryTransactionRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const eventEmitter = require('../utils/eventEmitter');
const AppError = require('../utils/appError');

const libraryService = {
    // Borrow book
    borrowBook: async (borrowData, actor) => {
        const { book_id, member_id, days_to_borrow = 14 } = borrowData;

        if (!book_id || !member_id) {
            throw new AppError('Book ID and Member ID are required', 400);
        }

        // Check if book exists and is available
        const book = await bookRepository.findById(book_id);
        if (!book) {
            throw new AppError('Book not found', 404);
        }

        if (book.available_copies < 1) {
            throw new AppError('No copies available for borrowing', 400);
        }

        // Check member exists and is active
        const member = await libraryMemberRepository.findById(member_id);
        if (!member) {
            throw new AppError('Library member not found', 404);
        }

        if (!member.is_active) {
            throw new AppError('Member account is inactive', 400);
        }

        // Check if member has reached max books limit
        const currentBorrowed = await libraryTransactionRepository.countActiveByMember(member_id);
        if (currentBorrowed >= member.max_books_allowed) {
            throw new AppError(`Member has reached maximum allowed books (${member.max_books_allowed})`, 400);
        }

        // Check if member has overdue books
        const hasOverdue = await libraryTransactionRepository.hasOverdueBooks(member_id);
        if (hasOverdue) {
            throw new AppError('Member has overdue books. Please return them first.', 400);
        }

        const borrowDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + days_to_borrow);

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Update book copies
            await bookRepository.updateCopies(book_id, 'borrow', connection);

            // Create transaction
            const result = await libraryTransactionRepository.create({
                book_id,
                member_id,
                borrow_date: borrowDate.toISOString().split('T')[0],
                due_date: dueDate.toISOString().split('T')[0],
                borrowed_by: actor.user_id,
                campus_id: book.campus_id || 1
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'BOOK_BORROW',
                entity_name: 'book_transactions',
                entity_id: result.insertId,
                new_values: { book_id, member_id, due_date: dueDate },
                ip_address: actor.ip_address
            });

            // Emit notification event
            eventEmitter.emit('book.borrowed', {
                book_id,
                member_id,
                book_title: book.title,
                member_name: member.full_name,
                due_date: dueDate
            });

            return {
                id: result.insertId,
                book_id,
                member_id,
                borrow_date: borrowDate,
                due_date: dueDate,
                message: 'Book borrowed successfully'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Return book
    returnBook: async (transaction_id, actor) => {
        const transaction = await libraryTransactionRepository.findById(transaction_id);
        if (!transaction) {
            throw new AppError('Transaction not found', 404);
        }

        if (transaction.status === 'RETURNED') {
            throw new AppError('Book already returned', 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Calculate fine if overdue
            const returnDate = new Date();
            const dueDate = new Date(transaction.due_date);
            let fineAmount = 0;
            if (returnDate > dueDate) {
                const daysLate = Math.ceil((returnDate - dueDate) / (1000 * 60 * 60 * 24));
                // Example: 50 PKR per day late
                fineAmount = daysLate * 50;
            }

            // Update transaction
            await libraryTransactionRepository.update(transaction_id, {
                return_date: returnDate.toISOString().split('T')[0],
                status: 'RETURNED',
                fine_amount: fineAmount,
                returned_by: actor.user_id
            }, connection);

            // Update book copies
            await bookRepository.updateCopies(transaction.book_id, 'return', connection);

            // Create fine record if overdue
            if (fineAmount > 0) {
                await libraryTransactionRepository.createFine({
                    transaction_id,
                    member_id: transaction.member_id,
                    fine_type: 'OVERDUE',
                    amount: fineAmount,
                    campus_id: transaction.campus_id
                }, connection);
            }

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'BOOK_RETURN',
                entity_name: 'book_transactions',
                entity_id: parseInt(transaction_id),
                previous_values: { status: transaction.status },
                new_values: { status: 'RETURNED', fine_amount: fineAmount },
                ip_address: actor.ip_address
            });

            return {
                id: transaction_id,
                book_id: transaction.book_id,
                member_id: transaction.member_id,
                return_date: returnDate,
                fine_amount: fineAmount,
                message: fineAmount > 0 ? 'Book returned with overdue fine' : 'Book returned successfully'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get member's borrowing history
    getMemberHistory: async (member_id) => {
        const member = await libraryMemberRepository.findById(member_id);
        if (!member) {
            throw new AppError('Member not found', 404);
        }

        return await libraryTransactionRepository.findByMember(member_id);
    },

    // Get book transaction history
    getBookHistory: async (book_id) => {
        const book = await bookRepository.findById(book_id);
        if (!book) {
            throw new AppError('Book not found', 404);
        }

        return await libraryTransactionRepository.findByBook(book_id);
    },

    // Get overdue books
    getOverdueBooks: async (campus_id) => {
        return await libraryTransactionRepository.findOverdue(campus_id || 1);
    },

    // Get library statistics
    getLibraryStats: async (campus_id) => {
        const bookStats = await bookRepository.getStats(campus_id || 1);
        const memberStats = await libraryMemberRepository.getStats(campus_id || 1);
        const transactionStats = await libraryTransactionRepository.getStats(campus_id || 1);
        const overdueCount = await libraryTransactionRepository.countOverdue(campus_id || 1);

        return {
            books: bookStats,
            members: memberStats,
            transactions: transactionStats,
            overdue_count: overdueCount
        };
    }
};

module.exports = libraryService;