// ============================================
// FILE: src/repositories/classRepository.js
// PURPOSE: Database operations for classes
// ============================================

const db = require('../config/db');

const classRepository = {
    // Create new class
    create: async (classData, connection = null) => {
        const client = connection || db;
        const { name, section, class_teacher_id, academic_session_id, campus_id } = classData;
        
        const query = `
            INSERT INTO classes 
            (name, section, class_teacher_id, academic_session_id, campus_id) 
            VALUES (?, ?, ?, ?, ?)
        `;
        const [result] = await client.execute(query, [
            name, section || null, class_teacher_id || null, 
            academic_session_id, campus_id || 1
        ]);
        return result;
    },

    // Find all classes with pagination and filters
    findAll: async ({ search, academic_session_id, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `SELECT c.*, 
                     u.username as teacher_name,
                     CONCAT(c.name, ' ', IFNULL(c.section, '')) as full_name
                     FROM classes c
                     LEFT JOIN users u ON c.class_teacher_id = u.id
                     WHERE c.campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (academic_session_id) {
            query += ` AND c.academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        if (search) {
            query += ` AND (c.name LIKE ? OR c.section LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['name', 'section', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY c.${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Count total classes (for pagination)
    countAll: async ({ search, academic_session_id, campus_id }) => {
        let query = `SELECT COUNT(*) as total FROM classes WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (academic_session_id) {
            query += ` AND academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        if (search) {
            query += ` AND (name LIKE ? OR section LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Find class by ID
    findById: async (id, connection = null) => {
        const client = connection || db;
        const query = `
            SELECT c.*, 
                   u.username as teacher_name
            FROM classes c
            LEFT JOIN users u ON c.class_teacher_id = u.id
            WHERE c.id = ?
        `;
        const [rows] = await client.execute(query, [id]);
        return rows[0];
    },

    // Find class by name and section
    findByNameAndSection: async ({ name, section, academic_session_id, campus_id }) => {
        const query = `
            SELECT * FROM classes 
            WHERE name = ? AND section = ? AND academic_session_id = ? AND campus_id = ?
        `;
        const [rows] = await db.execute(query, [name, section || null, academic_session_id, campus_id || 1]);
        return rows[0];
    },

    // Get classes by academic session
    findBySession: async (academic_session_id, campus_id) => {
        const query = `
            SELECT * FROM classes 
            WHERE academic_session_id = ? AND campus_id = ?
            ORDER BY name
        `;
        const [rows] = await db.execute(query, [academic_session_id, campus_id || 1]);
        return rows;
    },

    // Update class
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const { name, section, class_teacher_id, academic_session_id } = updateData;
        
        const query = `
            UPDATE classes 
            SET name = ?, section = ?, class_teacher_id = ?, academic_session_id = ?
            WHERE id = ?
        `;
        const [result] = await client.execute(query, [
            name, section || null, class_teacher_id || null, 
            academic_session_id, id
        ]);
        return result;
    },

    // Delete class (soft delete)
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `DELETE FROM classes WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    },

    // Check if class has students
    hasStudents: async (id) => {
        const query = `SELECT COUNT(*) as count FROM students WHERE class_name = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0].count > 0;
    },

    // Get student count for a class
    getStudentCount: async (class_id, academic_session_id, campus_id) => {
        const query = `
            SELECT COUNT(*) as count FROM students 
            WHERE class_name = ? AND academic_session_id = ? AND campus_id = ? AND deleted_at IS NULL
        `;
        const [rows] = await db.execute(query, [class_id, academic_session_id, campus_id || 1]);
        return rows[0].count;
    },

    // Get classes with student counts (for reporting)
    findAll: async ({ search, academic_session_id, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `
            SELECT c.*, 
                   u.username as teacher_name,
                   CONCAT(c.name, ' ', IFNULL(c.section, '')) as full_name
            FROM classes c
            LEFT JOIN users u ON c.class_teacher_id = u.id
            WHERE c.campus_id = ?
        `;
        const queryParams = [campus_id || 1];
    
        // ✅ Only add academic_session_id if it exists
        if (academic_session_id) {
            query += ` AND c.academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }
    
        if (search) {
            query += ` AND (c.name LIKE ? OR c.section LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }
    
        const allowedSortFields = ['name', 'section', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY c.${sortByField} ${sortOrderValue}`;
    
        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit) || 10, parseInt(offset) || 0);
        }
    
        console.log('🔍 SQL Query:', query);
        console.log('🔍 Query Params:', queryParams);
    
        const [rows] = await db.execute(query, queryParams);
        return rows;
    } // Closes the method

} // Closes the Class or Object block

module.exports = classRepository;