// ============================================
// FILE: src/repositories/examRepository.js
// PURPOSE: Database operations for exams
// ============================================

const db = require('../config/db');

const examRepository = {
    // Create exam
    create: async (examData, connection = null) => {
        const client = connection || db;
        const {
            exam_type_id = null, name = null, class_id = null,
            academic_session_id = null, subject_id = null,
            exam_date = null, total_marks = 100, passing_marks = 33,
            is_practical = 0, practical_marks = null, theory_marks = null,
            start_time = null, end_time = null, description = null,
            campus_id = 1, created_by = null
        } = examData;

        const query = `
            INSERT INTO exams (
                exam_type_id, name, description, class_id,
                academic_session_id, subject_id, exam_date,
                start_time, end_time, total_marks, passing_marks,
                is_practical, practical_marks, theory_marks,
                campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            exam_type_id, name, description, class_id,
            academic_session_id, subject_id, exam_date,
            start_time, end_time, total_marks, passing_marks,
            is_practical, practical_marks, theory_marks,
            campus_id, created_by
        ]);
        return result;
    },

    // Find exam by ID
    findById: async (id) => {
        const query = `
            SELECT e.*, et.name as exam_type_name, s.name as subject_name,
                   c.name as class_name
            FROM exams e
            LEFT JOIN exam_types et ON e.exam_type_id = et.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN classes c ON e.class_id = c.id
            WHERE e.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    // Find exams by class
    findByClass: async (class_id, academic_session_id) => {
        const query = `
            SELECT e.*, et.name as exam_type_name, s.name as subject_name
            FROM exams e
            LEFT JOIN exam_types et ON e.exam_type_id = et.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE e.class_id = ? AND e.academic_session_id = ?
            ORDER BY e.exam_date DESC
        `;
        const [rows] = await db.execute(query, [class_id, academic_session_id]);
        return rows;
    },

    // Get all exams with pagination
    findAll: async ({ search, class_id, exam_type_id, subject_id, is_published, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `
            SELECT e.*, et.name as exam_type_name, s.name as subject_name,
                   c.name as class_name
            FROM exams e
            LEFT JOIN exam_types et ON e.exam_type_id = et.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN classes c ON e.class_id = c.id
            WHERE e.campus_id = ?
        `;
        const queryParams = [campus_id || 1];

        if (class_id) {
            query += ` AND e.class_id = ?`;
            queryParams.push(class_id);
        }

        if (exam_type_id) {
            query += ` AND e.exam_type_id = ?`;
            queryParams.push(exam_type_id);
        }

        if (subject_id) {
            query += ` AND e.subject_id = ?`;
            queryParams.push(subject_id);
        }

        if (is_published !== undefined && is_published !== null) {
            query += ` AND e.is_published = ?`;
            queryParams.push(is_published);
        }

        if (search) {
            query += ` AND (e.name LIKE ? OR s.name LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['name', 'exam_date', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY e.${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Count total exams
    countAll: async ({ search, class_id, exam_type_id, subject_id, is_published, campus_id }) => {
        let query = `SELECT COUNT(*) as total FROM exams WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (class_id) {
            query += ` AND class_id = ?`;
            queryParams.push(class_id);
        }

        if (exam_type_id) {
            query += ` AND exam_type_id = ?`;
            queryParams.push(exam_type_id);
        }

        if (subject_id) {
            query += ` AND subject_id = ?`;
            queryParams.push(subject_id);
        }

        if (is_published !== undefined && is_published !== null) {
            query += ` AND is_published = ?`;
            queryParams.push(is_published);
        }

        if (search) {
            query += ` AND (name LIKE ? OR subject_id IN (SELECT id FROM subjects WHERE name LIKE ?))`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Update exam
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'exam_type_id', 'name', 'description', 'class_id',
            'subject_id', 'exam_date', 'start_time', 'end_time',
            'total_marks', 'passing_marks', 'is_practical',
            'practical_marks', 'theory_marks', 'is_published',
            'published_at', 'updated_by'
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
        const query = `UPDATE exams SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    // Delete exam
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `DELETE FROM exams WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    },

    // Get exam statistics
    getExamStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_exams,
                SUM(CASE WHEN is_published = TRUE THEN 1 ELSE 0 END) as published_exams,
                SUM(CASE WHEN is_published = FALSE THEN 1 ELSE 0 END) as draft_exams,
                COUNT(DISTINCT class_id) as classes_with_exams,
                COUNT(DISTINCT subject_id) as subjects_with_exams
            FROM exams
            WHERE campus_id = ?
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    }
};

module.exports = examRepository;