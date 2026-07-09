// ============================================
// FILE: src/repositories/libraryMemberRepository.js
// PURPOSE: Database operations for library members
// ============================================

const db = require('../config/db');

const libraryMemberRepository = {
    // Create member
    create: async (memberData, connection = null) => {
        const client = connection || db;
        const {
            member_type = null, student_id = null, employee_id = null,
            full_name = null, email = null, phone = null,
            member_code = null, membership_date = null, expiry_date = null,
            max_books_allowed = 3, max_days_allowed = 14,
            is_active = 1, campus_id = 1
        } = memberData;

        const query = `
            INSERT INTO library_members (
                member_type, student_id, employee_id, full_name, email, phone,
                member_code, membership_date, expiry_date, max_books_allowed,
                max_days_allowed, is_active, campus_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            member_type, student_id, employee_id, full_name, email, phone,
            member_code, membership_date, expiry_date, max_books_allowed,
            max_days_allowed, is_active, campus_id
        ]);
        return result;
    },

    // Find member by ID
    findById: async (id) => {
        const query = `
            SELECT lm.*, s.roll_no, s.first_name as student_first_name, s.last_name as student_last_name,
                   e.employee_code, e.first_name as employee_first_name, e.last_name as employee_last_name
            FROM library_members lm
            LEFT JOIN students s ON lm.student_id = s.id
            LEFT JOIN employees e ON lm.employee_id = e.id
            WHERE lm.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    // Find member by student ID
    findByStudent: async (student_id, campus_id) => {
        const query = `
            SELECT * FROM library_members 
            WHERE student_id = ? AND campus_id = ?
        `;
        const [rows] = await db.execute(query, [student_id, campus_id || 1]);
        return rows[0];
    },

    // Find all members
    findAll: async ({ search, member_type, is_active, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `
            SELECT lm.*, 
                   CASE WHEN lm.member_type = 'STUDENT' THEN CONCAT(s.first_name, ' ', s.last_name)
                        WHEN lm.member_type = 'TEACHER' THEN CONCAT(e.first_name, ' ', e.last_name)
                        ELSE lm.full_name END as display_name
            FROM library_members lm
            LEFT JOIN students s ON lm.student_id = s.id
            LEFT JOIN employees e ON lm.employee_id = e.id
            WHERE lm.campus_id = ?
        `;
        const queryParams = [campus_id || 1];

        if (member_type) {
            query += ` AND lm.member_type = ?`;
            queryParams.push(member_type);
        }

        if (is_active !== undefined && is_active !== null) {
            query += ` AND lm.is_active = ?`;
            queryParams.push(is_active);
        }

        if (search) {
            query += ` AND (lm.full_name LIKE ? OR lm.member_code LIKE ? OR lm.email LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['full_name', 'member_code', 'membership_date', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY lm.${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Count members
    countAll: async ({ search, member_type, is_active, campus_id }) => {
        let query = `SELECT COUNT(*) as total FROM library_members WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (member_type) {
            query += ` AND member_type = ?`;
            queryParams.push(member_type);
        }

        if (is_active !== undefined && is_active !== null) {
            query += ` AND is_active = ?`;
            queryParams.push(is_active);
        }

        if (search) {
            query += ` AND (full_name LIKE ? OR member_code LIKE ? OR email LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Update member
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'member_type', 'student_id', 'employee_id', 'full_name',
            'email', 'phone', 'expiry_date', 'max_books_allowed',
            'max_days_allowed', 'is_active'
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
        const query = `UPDATE library_members SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    // Get member statistics
    getStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_members,
                SUM(CASE WHEN member_type = 'STUDENT' THEN 1 ELSE 0 END) as student_members,
                SUM(CASE WHEN member_type = 'TEACHER' THEN 1 ELSE 0 END) as teacher_members,
                SUM(CASE WHEN member_type = 'STAFF' THEN 1 ELSE 0 END) as staff_members,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_members,
                AVG(max_books_allowed) as avg_max_books
            FROM library_members
            WHERE campus_id = ?
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    }
};

module.exports = libraryMemberRepository;