// ============================================
// FILE: src/repositories/feePaymentRepository.js
// PURPOSE: Database operations for fee payments
// ============================================

const db = require('../config/db');

const feePaymentRepository = {
    // Create payment record
    create: async (paymentData, connection = null) => {
        const client = connection || db;
        const {
            invoice_id = null, student_id = null, amount_paid = 0,
            payment_method_id = null, transaction_id = null,
            payment_status = 'COMPLETED', remarks = null,
            receipt_number = null, bank_name = null,
            cheque_number = null, cheque_date = null,
            processed_by = null, campus_id = 1
        } = paymentData;

        const query = `
            INSERT INTO fee_payments (
                invoice_id, student_id, amount_paid, payment_method_id,
                transaction_id, payment_status, remarks, receipt_number,
                bank_name, cheque_number, cheque_date, processed_by, campus_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            invoice_id, student_id, amount_paid, payment_method_id,
            transaction_id, payment_status, remarks, receipt_number,
            bank_name, cheque_number, cheque_date, processed_by, campus_id
        ]);
        return result;
    },

    // Find payment by ID
    findById: async (id) => {
        const query = `
            SELECT fp.*, s.roll_no, s.first_name, s.last_name,
                   pm.name as payment_method_name, u.username as processed_by_name
            FROM fee_payments fp
            JOIN students s ON fp.student_id = s.id
            JOIN payment_methods pm ON fp.payment_method_id = pm.id
            JOIN users u ON fp.processed_by = u.id
            WHERE fp.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    // Find payments by student
    findByStudent: async (student_id, academic_session_id) => {
        let query = `
            SELECT fp.*, pm.name as payment_method_name,
                   fi.amount as invoice_amount, fi.due_date
            FROM fee_payments fp
            JOIN payment_methods pm ON fp.payment_method_id = pm.id
            JOIN fee_invoices fi ON fp.invoice_id = fi.id
            WHERE fp.student_id = ?
        `;
        const queryParams = [student_id];

        if (academic_session_id) {
            query += ` AND fi.academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        query += ` ORDER BY fp.payment_date DESC`;

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Find payments by invoice
    findByInvoice: async (invoice_id) => {
        const query = `
            SELECT fp.*, pm.name as payment_method_name,
                   u.username as processed_by_name
            FROM fee_payments fp
            JOIN payment_methods pm ON fp.payment_method_id = pm.id
            JOIN users u ON fp.processed_by = u.id
            WHERE fp.invoice_id = ?
            ORDER BY fp.payment_date DESC
        `;
        const [rows] = await db.execute(query, [invoice_id]);
        return rows;
    },

    // Get total payments for a student
    getTotalPaid: async (student_id, academic_session_id) => {
        const query = `
            SELECT COALESCE(SUM(amount_paid), 0) as total_paid
            FROM fee_payments fp
            JOIN fee_invoices fi ON fp.invoice_id = fi.id
            WHERE fp.student_id = ? 
              AND fi.academic_session_id = ?
              AND fp.payment_status = 'COMPLETED'
        `;
        const [rows] = await db.execute(query, [student_id, academic_session_id]);
        return rows[0].total_paid;
    },

    // Get all payments with pagination
    findAll: async ({ search, student_id, payment_method_id, payment_status, date_from, date_to, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `
            SELECT fp.*, s.roll_no, s.first_name, s.last_name,
                   pm.name as payment_method_name, u.username as processed_by_name
            FROM fee_payments fp
            JOIN students s ON fp.student_id = s.id
            JOIN payment_methods pm ON fp.payment_method_id = pm.id
            JOIN users u ON fp.processed_by = u.id
            WHERE fp.campus_id = ?
        `;
        const queryParams = [campus_id || 1];

        if (student_id) {
            query += ` AND fp.student_id = ?`;
            queryParams.push(student_id);
        }

        if (payment_method_id) {
            query += ` AND fp.payment_method_id = ?`;
            queryParams.push(payment_method_id);
        }

        if (payment_status) {
            query += ` AND fp.payment_status = ?`;
            queryParams.push(payment_status);
        }

        if (date_from && date_to) {
            query += ` AND DATE(fp.payment_date) BETWEEN ? AND ?`;
            queryParams.push(date_from, date_to);
        }

        if (search) {
            query += ` AND (s.roll_no LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR fp.receipt_number LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['payment_date', 'amount_paid', 'receipt_number'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'payment_date';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY fp.${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Count total payments
    countAll: async ({ search, student_id, payment_method_id, payment_status, date_from, date_to, campus_id }) => {
        let query = `SELECT COUNT(*) as total FROM fee_payments WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (student_id) {
            query += ` AND student_id = ?`;
            queryParams.push(student_id);
        }

        if (payment_method_id) {
            query += ` AND payment_method_id = ?`;
            queryParams.push(payment_method_id);
        }

        if (payment_status) {
            query += ` AND payment_status = ?`;
            queryParams.push(payment_status);
        }

        if (date_from && date_to) {
            query += ` AND DATE(payment_date) BETWEEN ? AND ?`;
            queryParams.push(date_from, date_to);
        }

        if (search) {
            query += ` AND (student_id IN (SELECT id FROM students WHERE roll_no LIKE ? OR first_name LIKE ? OR last_name LIKE ?) OR receipt_number LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Update payment status
    updateStatus: async (id, status, connection = null) => {
        const client = connection || db;
        const query = `UPDATE fee_payments SET payment_status = ? WHERE id = ?`;
        const [result] = await client.execute(query, [status, id]);
        return result;
    },

    // Get payment statistics
    getPaymentStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_payments,
                SUM(amount_paid) as total_amount,
                AVG(amount_paid) as avg_amount,
                SUM(CASE WHEN payment_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_payments,
                SUM(CASE WHEN payment_status = 'PENDING' THEN 1 ELSE 0 END) as pending_payments,
                SUM(CASE WHEN payment_status = 'FAILED' THEN 1 ELSE 0 END) as failed_payments,
                SUM(CASE WHEN DATE(payment_date) = CURDATE() THEN 1 ELSE 0 END) as today_payments,
                SUM(CASE WHEN DATE(payment_date) = CURDATE() THEN amount_paid ELSE 0 END) as today_amount
            FROM fee_payments
            WHERE campus_id = ?
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    },

    // Get daily payment summary
    getDailySummary: async (date, campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_payments,
                SUM(amount_paid) as total_amount,
                pm.name as payment_method,
                COUNT(DISTINCT student_id) as unique_students
            FROM fee_payments fp
            JOIN payment_methods pm ON fp.payment_method_id = pm.id
            WHERE DATE(fp.payment_date) = ? AND fp.campus_id = ? AND fp.payment_status = 'COMPLETED'
            GROUP BY pm.name
        `;
        const [rows] = await db.execute(query, [date, campus_id || 1]);
        return rows;
    }
};

module.exports = feePaymentRepository;