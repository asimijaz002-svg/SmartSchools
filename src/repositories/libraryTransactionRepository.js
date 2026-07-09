// ============================================
// FILE: src/repositories/libraryTransactionRepository.js
// PURPOSE: Database operations for library transactions
// ============================================

const db = require('../config/db');

const libraryTransactionRepository = {
    // Create transaction
    create: async (transactionData, connection = null) => {
        const client = connection || db;
        const {
            book_id = null, member_id = null, borrow_date = null,
            due_date = null, borrowed_by = null, campus_id = 1
        } = transactionData;

        const query = `
            INSERT INTO book_transactions (
                book_id, member_id, borrow_date, due_date, status, borrowed_by, campus_id
            ) VALUES (?, ?, ?, ?, 'BORROWED', ?, ?)
        `;

        const [result] = await client.execute(query, [
            book_id, member_id, borrow_date, due_date, borrowed_by, campus_id
        ]);
        return result;
    },

    // Find transaction by ID
    findById: async (id) => {
        const query = `
            SELECT bt.*, b.title as book_title, b.isbn,
                   lm.full_name as member_name, lm.member_code
            FROM book_transactions bt
            JOIN books b ON bt.book_id = b.id
            JOIN library_members lm ON bt.member_id = lm.id
            WHERE bt.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    // Find transactions by member
    findByMember: async (member_id) => {
        const query = `
            SELECT bt.*, b.title as book_title, b.isbn, b.author
            FROM book_transactions bt
            JOIN books b ON bt.book_id = b.id
            WHERE bt.member_id = ?
            ORDER BY bt.created_at DESC
        `;
        const [rows] = await db.execute(query, [member_id]);
        return rows;
    },

    // Find transactions by book
    findByBook: async (book_id) => {
        const query = `
            SELECT bt.*, lm.full_name as member_name, lm.member_code
            FROM book_transactions bt
            JOIN library_members lm ON bt.member_id = lm.id
            WHERE bt.book_id = ?
            ORDER BY bt.created_at DESC
        `;
        const [rows] = await db.execute(query, [book_id]);
        return rows;
    },

    // Count active borrows by member
    countActiveByMember: async (member_id) => {
        const query = `
            SELECT COUNT(*) as count FROM book_transactions
            WHERE member_id = ? AND status IN ('BORROWED', 'OVERDUE')
        `;
        const [rows] = await db.execute(query, [member_id]);
        return rows[0].count;
    },

    // Check if member has overdue books
    hasOverdueBooks: async (member_id) => {
        const query = `
            SELECT COUNT(*) as count FROM book_transactions
            WHERE member_id = ? AND status = 'OVERDUE'
        `;
        const [rows] = await db.execute(query, [member_id]);
        return rows[0].count > 0;
    },

    // Find overdue books
    findOverdue: async (campus_id) => {
        const query = `
            SELECT bt.*, b.title as book_title, b.isbn,
                   lm.full_name as member_name, lm.member_code,
                   DATEDIFF(CURDATE(), bt.due_date) as days_overdue
            FROM book_transactions bt
            JOIN books b ON bt.book_id = b.id
            JOIN library_members lm ON bt.member_id = lm.id
            WHERE bt.due_date < CURDATE() 
              AND bt.status IN ('BORROWED', 'OVERDUE')
              AND bt.campus_id = ?
            ORDER BY bt.due_date ASC
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows;
    },

    // Count overdue books
    countOverdue: async (campus_id) => {
        const query = `
            SELECT COUNT(*) as count FROM book_transactions
            WHERE due_date < CURDATE() 
              AND status IN ('BORROWED', 'OVERDUE')
              AND campus_id = ?
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0].count;
    },

    // Update transaction
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'return_date', 'status', 'fine_amount', 'fine_paid', 'remarks', 'returned_by'
        ];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (fields.length === 0) {
            return { affectedRows: 0 };
        }

        values.push(id);
        const query = `UPDATE book_transactions SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    // Create fine record
    createFine: async (fineData, connection = null) => {
        const client = connection || db;
        const {
            transaction_id = null, member_id = null, fine_type = 'OVERDUE',
            amount = 0, campus_id = 1
        } = fineData;

        const query = `
            INSERT INTO library_fines (
                transaction_id, member_id, fine_type, amount, status, campus_id
            ) VALUES (?, ?, ?, ?, 'PENDING', ?)
        `;

        const [result] = await client.execute(query, [
            transaction_id, member_id, fine_type, amount, campus_id
        ]);
        return result;
    },

    // Get transaction statistics
    getStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_transactions,
                SUM(CASE WHEN status = 'BORROWED' THEN 1 ELSE 0 END) as active_borrows,
                SUM(CASE WHEN status = 'OVERDUE' THEN 1 ELSE 0 END) as overdue_borrows,
                SUM(CASE WHEN status = 'RETURNED' THEN 1 ELSE 0 END) as returned_books,
                SUM(CASE WHEN DATE(borrow_date) = CURDATE() THEN 1 ELSE 0 END) as today_borrows,
                SUM(CASE WHEN DATE(return_date) = CURDATE() THEN 1 ELSE 0 END) as today_returns,
                COALESCE(SUM(fine_amount), 0) as total_fines
            FROM book_transactions
            WHERE campus_id = ?
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    }
};

module.exports = libraryTransactionRepository;