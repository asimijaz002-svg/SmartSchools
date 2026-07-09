// ============================================
// FILE: src/repositories/invoiceRepository.js
// PURPOSE: Database operations for fee invoices
// ============================================

const db = require('../config/db');

const invoiceRepository = {
    // Create invoice
    create: async (invoiceData, connection = null) => {
        const client = connection || db;
        const { student_id, amount, due_date, academic_session_id, fee_category_id } = invoiceData;

        const query = `
            INSERT INTO fee_invoices (student_id, amount, due_date, academic_session_id, fee_category_id, status)
            VALUES (?, ?, ?, ?, ?, 'unpaid')
        `;
        const [result] = await client.execute(query, [
            student_id, amount, due_date, academic_session_id || null, fee_category_id || null
        ]);
        return result;
    },

    // ✅ ADD THIS METHOD
    findById: async (id, connection = null) => {
        const client = connection || db;
        const query = `
            SELECT fi.*, s.roll_no, s.first_name, s.last_name, s.class_name
            FROM fee_invoices fi
            JOIN students s ON fi.student_id = s.id
            WHERE fi.id = ?
        `;
        const [rows] = await client.execute(query, [id]);
        return rows[0];
    },

    // Find invoices by student
    findByStudent: async (student_id, academic_session_id) => {
        let query = `
            SELECT * FROM fee_invoices 
            WHERE student_id = ?
        `;
        const queryParams = [student_id];

        if (academic_session_id) {
            query += ` AND academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        query += ` ORDER BY due_date ASC`;

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Find unpaid invoices by student
    findUnpaidByStudent: async (student_id) => {
        const query = `
            SELECT * FROM fee_invoices 
            WHERE student_id = ? AND status = 'unpaid'
            ORDER BY due_date ASC
        `;
        const [rows] = await db.execute(query, [student_id]);
        return rows;
    },

    // Get all invoices with pagination
    findAll: async ({ search, student_id, status, academic_session_id, date_from, date_to, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `
            SELECT fi.*, s.roll_no, s.first_name, s.last_name, s.class_name
            FROM fee_invoices fi
            JOIN students s ON fi.student_id = s.id
            WHERE fi.campus_id = ?
        `;
        const queryParams = [campus_id || 1];

        if (student_id) {
            query += ` AND fi.student_id = ?`;
            queryParams.push(student_id);
        }

        if (status) {
            query += ` AND fi.status = ?`;
            queryParams.push(status);
        }

        if (academic_session_id) {
            query += ` AND fi.academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        if (date_from && date_to) {
            query += ` AND fi.created_at BETWEEN ? AND ?`;
            queryParams.push(date_from, date_to);
        }

        if (search) {
            query += ` AND (s.roll_no LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['amount', 'due_date', 'created_at', 'status'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY fi.${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Count total invoices
    countAll: async ({ search, student_id, status, academic_session_id, date_from, date_to, campus_id }) => {
        let query = `SELECT COUNT(*) as total FROM fee_invoices WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (student_id) {
            query += ` AND student_id = ?`;
            queryParams.push(student_id);
        }

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        if (academic_session_id) {
            query += ` AND academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        if (date_from && date_to) {
            query += ` AND created_at BETWEEN ? AND ?`;
            queryParams.push(date_from, date_to);
        }

        if (search) {
            query += ` AND student_id IN (SELECT id FROM students WHERE roll_no LIKE ? OR first_name LIKE ? OR last_name LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Update invoice status
    updateStatus: async (id, status, connection = null) => {
        const client = connection || db;
        const query = `UPDATE fee_invoices SET status = ? WHERE id = ?`;
        const [result] = await client.execute(query, [status, id]);
        return result;
    },

    // Update invoice amount
    updateAmount: async (id, amount, connection = null) => {
        const client = connection || db;
        const query = `UPDATE fee_invoices SET amount = ? WHERE id = ?`;
        const [result] = await client.execute(query, [amount, id]);
        return result;
    },

    // Get invoice statistics
    getInvoiceStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_invoices,
                SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_invoices,
                SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_invoices,
                SUM(CASE WHEN status = 'unpaid' THEN amount ELSE 0 END) as total_unpaid_amount,
                SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_paid_amount,
                SUM(amount) as total_amount
            FROM fee_invoices
            WHERE campus_id = ?
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    },

    // Delete invoice
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `DELETE FROM fee_invoices WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    }
};

module.exports = invoiceRepository;