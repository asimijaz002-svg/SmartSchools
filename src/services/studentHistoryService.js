// ============================================
// FILE: src/services/studentHistoryService.js
// PURPOSE: Business logic for student history/timeline
// ============================================

const dbPool = require('../config/db');
const AppError = require('../utils/appError');

const studentHistoryService = {
    // Add event to student history
    addHistoryEvent: async ({ student_id, event_type, event_date, description, previous_values, new_values, created_by }) => {
        const connection = await dbPool.getConnection();
        try {
            const query = `
                INSERT INTO student_history (
                    student_id, event_type, event_date, description,
                    previous_values, new_values, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            const [result] = await connection.execute(query, [
                student_id, event_type, event_date, description,
                JSON.stringify(previous_values || null),
                JSON.stringify(new_values || null),
                created_by
            ]);
            return { id: result.insertId };
        } finally {
            connection.release();
        }
    },

    // Get student timeline
    getStudentTimeline: async (student_id, limit = 20) => {
        const query = `
            SELECT sh.*, u.username as created_by_name
            FROM student_history sh
            LEFT JOIN users u ON sh.created_by = u.id
            WHERE sh.student_id = ?
            ORDER BY sh.created_at DESC
            LIMIT ?
        `;
        const [rows] = await dbPool.execute(query, [student_id, limit]);
        return rows;
    },

    // Get student history by event type
    getHistoryByEventType: async (student_id, event_type) => {
        const query = `
            SELECT sh.*, u.username as created_by_name
            FROM student_history sh
            LEFT JOIN users u ON sh.created_by = u.id
            WHERE sh.student_id = ? AND sh.event_type = ?
            ORDER BY sh.created_at DESC
        `;
        const [rows] = await dbPool.execute(query, [student_id, event_type]);
        return rows;
    }
};

module.exports = studentHistoryService;