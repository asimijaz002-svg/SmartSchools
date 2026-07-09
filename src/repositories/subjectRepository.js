// ============================================
// FILE: src/repositories/studentRepository.js
// PURPOSE: Database operations for students
// ============================================

const db = require('../config/db');

const studentRepository = {
    // ============================================
    // CREATE
    // ============================================

    create: async (studentData, connection = null) => {
        const client = connection || db;
        const {
            roll_no = null, admission_number = null, first_name = null,
            last_name = null, email = null, class_name = null,
            section_id = null, academic_session_id = null, campus_id = 1,
            admission_date = null, date_of_birth = null, gender = null,
            nationality = null, religion = null, blood_group = null,
            status = 'ACTIVE', previous_school = null, admission_type = 'NEW',
            profile_picture = null, emergency_contact = null,
            medical_conditions = null, allergies = null,
            is_special_needs = 0, special_needs_details = null,
            father_occupation = null, father_education = null,
            mother_occupation = null, mother_education = null,
            family_income = null, number_of_siblings = 0,
            sibling_names = null, transport_required = 0,
            transport_route_id = null, hostel_required = 0,
            scholarship_type = null, scholarship_percentage = 0,
            is_sibling_discount = 0, sibling_discount_percentage = 0
        } = studentData;

        const query = `
            INSERT INTO students (
                roll_no, admission_number, first_name, last_name, email,
                class_name, section_id, academic_session_id, campus_id,
                admission_date, date_of_birth, gender, nationality, religion,
                blood_group, status, previous_school, admission_type,
                profile_picture, emergency_contact, medical_conditions,
                allergies, is_special_needs, special_needs_details,
                father_occupation, father_education, mother_occupation,
                mother_education, family_income, number_of_siblings,
                sibling_names, transport_required, transport_route_id,
                hostel_required, scholarship_type, scholarship_percentage,
                is_sibling_discount, sibling_discount_percentage
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            roll_no, admission_number, first_name, last_name, email,
            class_name, section_id, academic_session_id, campus_id,
            admission_date, date_of_birth, gender, nationality, religion,
            blood_group, status, previous_school, admission_type,
            profile_picture, emergency_contact, medical_conditions,
            allergies, is_special_needs, special_needs_details,
            father_occupation, father_education, mother_occupation,
            mother_education, family_income, number_of_siblings,
            sibling_names, transport_required, transport_route_id,
            hostel_required, scholarship_type, scholarship_percentage,
            is_sibling_discount, sibling_discount_percentage
        ]);
        return result;
    },

    // ============================================
    // READ
    // ============================================

    findById: async (id) => {
        const query = `SELECT * FROM students WHERE id = ? AND deleted_at IS NULL`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    findByRollNo: async (roll_no) => {
        const query = `SELECT * FROM students WHERE roll_no = ? AND deleted_at IS NULL`;
        const [rows] = await db.execute(query, [roll_no]);
        return rows[0];
    },

    findByAdmissionNumber: async (admission_number, campus_id) => {
        const query = `
            SELECT * FROM students 
            WHERE admission_number = ? AND campus_id = ? AND deleted_at IS NULL
        `;
        const [rows] = await db.execute(query, [admission_number, campus_id || 1]);
        return rows[0];
    },

    // 👇 THIS IS THE METHOD YOU NEED FOR EXAMS
    findByClass: async (class_name, academic_session_id) => {
        const query = `
            SELECT id, roll_no, first_name, last_name, class_name
            FROM students 
            WHERE class_name = ? AND academic_session_id = ? 
              AND deleted_at IS NULL AND status = 'ACTIVE'
            ORDER BY roll_no
        `;
        const [rows] = await db.execute(query, [class_name, academic_session_id]);
        return rows;
    },

    findByStatus: async (status, academic_session_id, campus_id) => {
        const query = `
            SELECT * FROM students 
            WHERE status = ? AND academic_session_id = ? 
              AND campus_id = ? AND deleted_at IS NULL
            ORDER BY roll_no
        `;
        const [rows] = await db.execute(query, [status, academic_session_id, campus_id || 1]);
        return rows;
    },

    findByClassAdvanced: async ({ class_name, section_id, status, academic_session_id, campus_id }) => {
        let query = `
            SELECT s.*, c.name as class_section_name
            FROM students s
            LEFT JOIN classes c ON s.section_id = c.id
            WHERE s.class_name = ? AND s.academic_session_id = ? 
              AND s.campus_id = ? AND s.deleted_at IS NULL
        `;
        const queryParams = [class_name, academic_session_id, campus_id || 1];

        if (section_id) {
            query += ` AND s.section_id = ?`;
            queryParams.push(section_id);
        }

        if (status) {
            query += ` AND s.status = ?`;
            queryParams.push(status);
        }

        query += ` ORDER BY s.roll_no`;

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    findAll: async ({ search, class_name, academic_session_id, sortBy, sortOrder, limit, offset }) => {
        let query = `SELECT * FROM students WHERE deleted_at IS NULL`;
        const queryParams = [];

        if (academic_session_id) {
            query += ` AND academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        if (class_name) {
            query += ` AND class_name = ?`;
            queryParams.push(class_name);
        }

        if (search) {
            query += ` AND (first_name LIKE ? OR last_name LIKE ? OR roll_no LIKE ? OR email LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['first_name', 'last_name', 'roll_no', 'created_at'];
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

    countAll: async ({ search, class_name, academic_session_id }) => {
        let query = `SELECT COUNT(*) as total FROM students WHERE deleted_at IS NULL`;
        const queryParams = [];

        if (academic_session_id) {
            query += ` AND academic_session_id = ?`;
            queryParams.push(academic_session_id);
        }

        if (class_name) {
            query += ` AND class_name = ?`;
            queryParams.push(class_name);
        }

        if (search) {
            query += ` AND (first_name LIKE ? OR last_name LIKE ? OR roll_no LIKE ? OR email LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // ============================================
    // UPDATE
    // ============================================

    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'roll_no', 'admission_number', 'first_name', 'last_name', 'email',
            'class_name', 'section_id', 'academic_session_id', 'admission_date',
            'date_of_birth', 'gender', 'nationality', 'religion', 'blood_group',
            'status', 'previous_school', 'admission_type', 'profile_picture',
            'emergency_contact', 'medical_conditions', 'allergies',
            'is_special_needs', 'special_needs_details', 'father_occupation',
            'father_education', 'mother_occupation', 'mother_education',
            'family_income', 'number_of_siblings', 'sibling_names',
            'transport_required', 'transport_route_id', 'hostel_required',
            'scholarship_type', 'scholarship_percentage', 'is_sibling_discount',
            'sibling_discount_percentage'
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
        const query = `UPDATE students SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    updateProfilePicture: async (id, fileName, connection = null) => {
        const client = connection || db;
        const query = `UPDATE students SET profile_picture = ? WHERE id = ?`;
        const [result] = await client.execute(query, [fileName, id]);
        return result;
    },

    updateStatus: async (id, status, connection = null) => {
        const client = connection || db;
        const query = `UPDATE students SET status = ? WHERE id = ?`;
        const [result] = await client.execute(query, [status, id]);
        return result;
    },

    // ============================================
    // DELETE (Soft)
    // ============================================

    softDelete: async (id, connection = null) => {
        const client = connection || db;
        const query = `UPDATE students SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    },

    // ============================================
    // GUARDIANS & DOCUMENTS
    // ============================================

    getFullStudentDetails: async (id) => {
        const query = `
            SELECT s.*, c.name as class_section_name
            FROM students s
            LEFT JOIN classes c ON s.section_id = c.id
            WHERE s.id = ? AND s.deleted_at IS NULL
        `;
        const [student] = await db.execute(query, [id]);
        return student[0];
    },

    getGuardians: async (student_id) => {
        const query = `
            SELECT sg.*, gt.name as guardian_type_name, gt.code as guardian_type_code
            FROM student_guardians sg
            JOIN guardian_types gt ON sg.guardian_type_id = gt.id
            WHERE sg.student_id = ? AND sg.is_active = TRUE
            ORDER BY gt.is_primary DESC, sg.id
        `;
        const [rows] = await db.execute(query, [student_id]);
        return rows;
    },

    getDocuments: async (student_id) => {
        const query = `
            SELECT * FROM student_documents
            WHERE student_id = ? AND is_active = TRUE
            ORDER BY upload_date DESC
        `;
        const [rows] = await db.execute(query, [student_id]);
        return rows;
    },

    getHistory: async (student_id, limit = 20) => {
        const query = `
            SELECT sh.*, u.username as created_by_username
            FROM student_history sh
            LEFT JOIN users u ON sh.created_by = u.id
            WHERE sh.student_id = ?
            ORDER BY sh.created_at DESC
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [student_id, limit]);
        return rows;
    },

    // ============================================
    // STATISTICS & SEARCH
    // ============================================

    getStudentStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_students,
                SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_students,
                SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive_students,
                SUM(CASE WHEN status = 'ALUMNI' THEN 1 ELSE 0 END) as alumni,
                SUM(CASE WHEN gender = 'MALE' THEN 1 ELSE 0 END) as male_students,
                SUM(CASE WHEN gender = 'FEMALE' THEN 1 ELSE 0 END) as female_students,
                SUM(CASE WHEN transport_required = TRUE THEN 1 ELSE 0 END) as transport_students,
                SUM(CASE WHEN is_special_needs = TRUE THEN 1 ELSE 0 END) as special_needs_students,
                AVG(number_of_siblings) as avg_siblings,
                SUM(scholarship_percentage > 0) as scholarship_students
            FROM students
            WHERE campus_id = ? AND deleted_at IS NULL
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    },

    searchStudents: async ({ search, class_name, section_id, status, gender, date_from, date_to, campus_id }) => {
        let query = `
            SELECT s.*, c.name as class_section_name
            FROM students s
            LEFT JOIN classes c ON s.section_id = c.id
            WHERE s.campus_id = ? AND s.deleted_at IS NULL
        `;
        const queryParams = [campus_id || 1];

        if (search) {
            query += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.roll_no LIKE ? OR s.admission_number LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (class_name) {
            query += ` AND s.class_name = ?`;
            queryParams.push(class_name);
        }

        if (section_id) {
            query += ` AND s.section_id = ?`;
            queryParams.push(section_id);
        }

        if (status) {
            query += ` AND s.status = ?`;
            queryParams.push(status);
        }

        if (gender) {
            query += ` AND s.gender = ?`;
            queryParams.push(gender);
        }

        if (date_from && date_to) {
            query += ` AND s.admission_date BETWEEN ? AND ?`;
            queryParams.push(date_from, date_to);
        }

        query += ` ORDER BY s.roll_no`;

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // ============================================
    // BULK OPERATIONS
    // ============================================

    bulkCreate: async (studentRecords, connection = null) => {
        const client = connection || db;
        if (studentRecords.length === 0) return { affectedRows: 0 };

        const placeholders = studentRecords.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = studentRecords.flatMap(s => [
            s.roll_no, s.admission_number, s.first_name, s.last_name, s.email,
            s.class_name, s.section_id, s.academic_session_id, s.campus_id || 1,
            s.admission_date, s.date_of_birth, s.gender, s.nationality, s.religion,
            s.blood_group, s.status || 'ACTIVE', s.previous_school, s.admission_type || 'NEW',
            s.profile_picture, s.emergency_contact, s.medical_conditions,
            s.allergies, s.is_special_needs || false, s.special_needs_details,
            s.father_occupation, s.father_education, s.mother_occupation,
            s.mother_education, s.family_income, s.number_of_siblings || 0,
            s.sibling_names, s.transport_required || false, s.transport_route_id,
            s.hostel_required || false, s.scholarship_type, s.scholarship_percentage || 0,
            s.is_sibling_discount || false, s.sibling_discount_percentage || 0
        ]);

        const query = `
            INSERT INTO students (
                roll_no, admission_number, first_name, last_name, email,
                class_name, section_id, academic_session_id, campus_id,
                admission_date, date_of_birth, gender, nationality, religion,
                blood_group, status, previous_school, admission_type,
                profile_picture, emergency_contact, medical_conditions,
                allergies, is_special_needs, special_needs_details,
                father_occupation, father_education, mother_occupation,
                mother_education, family_income, number_of_siblings,
                sibling_names, transport_required, transport_route_id,
                hostel_required, scholarship_type, scholarship_percentage,
                is_sibling_discount, sibling_discount_percentage
            ) VALUES ${placeholders}
        `;

        const [result] = await client.execute(query, values);
        return result;
    }
};

module.exports = studentRepository;