// ============================================
// FILE: src/repositories/sessionRepository.js
// PURPOSE: Database operations for academic sessions
// ============================================

const db = require('../config/db');

const sessionRepository = {
    // Create new academic session
    create: async (sessionData, connection = null) => {
        const client = connection || db;
        const { name, start_date, end_date, is_active, campus_id } = sessionData;
        
        const query = `
            INSERT INTO academic_sessions 
            (name, start_date, end_date, is_active, campus_id) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await client.execute(query, [
            name, start_date, end_date, is_active || false, campus_id || 1
        ]);
        return result;
    },

    // Find all sessions with pagination
    findAll: async ({ search, is_active, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `SELECT * FROM academic_sessions WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (search) {
            query += ` AND name LIKE ?`;
            queryParams.push(`%${search}%`);
        }

        if (is_active !== undefined && is_active !== null) {
            query += ` AND is_active = ?`;
            queryParams.push(is_active);
        }

        const allowedSortFields = ['name', 'start_date', 'end_date', 'is_active', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Count total sessions (for pagination)
    countAll: async ({ search, is_active, campus_id }) => {
        let query = `SELECT COUNT(*) as total FROM academic_sessions WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (search) {
            query += ` AND name LIKE ?`;
            queryParams.push(`%${search}%`);
        }

        if (is_active !== undefined && is_active !== null) {
            query += ` AND is_active = ?`;
            queryParams.push(is_active);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Find session by ID
    findById: async (id, connection = null) => {
        const client = connection || db;
        const query = `SELECT * FROM academic_sessions WHERE id = ?`;
        const [rows] = await client.execute(query, [id]);
        return rows[0];
    },

    // Find session by name
    findByName: async (name, campus_id) => {
        const query = `SELECT * FROM academic_sessions WHERE name = ? AND campus_id = ?`;
        const [rows] = await db.execute(query, [name, campus_id || 1]);
        return rows[0];
    },

    // Get active session
    getActiveSession: async (campus_id) => {
        const query = `
            SELECT * FROM academic_sessions 
            WHERE is_active = TRUE AND campus_id = ? 
            ORDER BY created_at DESC LIMIT 1
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    },

    // Update session
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const { name, start_date, end_date, is_active } = updateData;
        
        const query = `
            UPDATE academic_sessions 
            SET name = ?, start_date = ?, end_date = ?, is_active = ?
            WHERE id = ?
        `;
        const [result] = await client.execute(query, [name, start_date, end_date, is_active, id]);
        return result;
    },

    // Set all sessions to inactive (before activating a new one)
    deactivateAllSessions: async (connection = null) => {
        const client = connection || db;
        const query = `UPDATE academic_sessions SET is_active = FALSE`;
        const [result] = await client.execute(query);
        return result;
    },

    // Activate a specific session (with transaction support)
    activateSession: async (id, connection = null) => {
        const client = connection || db;
        // First, deactivate all
        await sessionRepository.deactivateAllSessions(client);
        // Then activate the selected one
        const query = `UPDATE academic_sessions SET is_active = TRUE WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    },

    // Soft delete session
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `DELETE FROM academic_sessions WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    },

    // Get sessions by date range
    findByDateRange: async ({ start_date, end_date, campus_id }) => {
        const query = `
            SELECT * FROM academic_sessions 
            WHERE campus_id = ? AND start_date >= ? AND end_date <= ?
            ORDER BY start_date DESC
        `;
        const [rows] = await db.execute(query, [campus_id || 1, start_date, end_date]);
        return rows;
    },

    // Check if session has students enrolled
    hasStudents: async (id) => {
        const query = `SELECT COUNT(*) as count FROM students WHERE academic_session_id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0].count > 0;
    },

    // Check if session has classes
    hasClasses: async (id) => {
        const query = `SELECT COUNT(*) as count FROM classes WHERE academic_session_id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0].count > 0;
    }
};

module.exports = sessionRepository;