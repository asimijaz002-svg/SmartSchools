// ============================================
// FILE: src/repositories/employeeRepository.js
// PURPOSE: Database operations for employees
// ============================================

const db = require('../config/db');

const employeeRepository = {
    // Create employee
    create: async (employeeData, connection = null) => {
        const client = connection || db;
        const {
            employee_code = null, first_name = null, last_name = null,
            cnic = null, email = null, phone = null, alternative_phone = null,
            date_of_birth = null, gender = null, marital_status = null,
            nationality = null, religion = null, current_address = null,
            permanent_address = null, profile_picture = null,
            employee_group = null, department_id = null, designation_id = null,
            joining_date = null, employment_type = 'PERMANENT',
            contract_start_date = null, contract_end_date = null,
            probation_period_months = 3, status = 'ACTIVE',
            basic_salary = 0, house_allowance = 0, medical_allowance = 0,
            transport_allowance = 0, other_allowance = 0, tax_percentage = 0,
            bank_account_number = null, bank_name = null,
            emergency_contact_name = null, emergency_contact_relationship = null,
            emergency_contact_phone = null, highest_degree = null,
            specialization = null, years_of_experience = 0,
            teaching_subjects = null, is_class_teacher = 0,
            assigned_class_id = null, campus_id = 1, created_by = null
        } = employeeData;

        const query = `
            INSERT INTO employees (
                employee_code, first_name, last_name, cnic, email, phone,
                alternative_phone, date_of_birth, gender, marital_status,
                nationality, religion, current_address, permanent_address,
                profile_picture, employee_group, department_id, designation_id,
                joining_date, employment_type, contract_start_date,
                contract_end_date, probation_period_months, status,
                basic_salary, house_allowance, medical_allowance,
                transport_allowance, other_allowance, tax_percentage,
                bank_account_number, bank_name, emergency_contact_name,
                emergency_contact_relationship, emergency_contact_phone,
                highest_degree, specialization, years_of_experience,
                teaching_subjects, is_class_teacher, assigned_class_id,
                campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            employee_code, first_name, last_name, cnic, email, phone,
            alternative_phone, date_of_birth, gender, marital_status,
            nationality, religion, current_address, permanent_address,
            profile_picture, employee_group, department_id, designation_id,
            joining_date, employment_type, contract_start_date,
            contract_end_date, probation_period_months, status,
            basic_salary, house_allowance, medical_allowance,
            transport_allowance, other_allowance, tax_percentage,
            bank_account_number, bank_name, emergency_contact_name,
            emergency_contact_relationship, emergency_contact_phone,
            highest_degree, specialization, years_of_experience,
            teaching_subjects, is_class_teacher, assigned_class_id,
            campus_id || 1, created_by || null
        ]);
        return result;
    },

    // Find employee by ID
    findById: async (id) => {
        const query = `
            SELECT e.*, d.name as department_name, d.code as department_code,
                   des.name as designation_name, des.code as designation_code,
                   u.username as created_by_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN designations des ON e.designation_id = des.id
            LEFT JOIN users u ON e.created_by = u.id
            WHERE e.id = ? AND e.deleted_at IS NULL
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    // Find employee by code
    findByCode: async (employee_code, campus_id) => {
        const query = `
            SELECT * FROM employees 
            WHERE employee_code = ? AND campus_id = ? AND deleted_at IS NULL
        `;
        const [rows] = await db.execute(query, [employee_code, campus_id || 1]);
        return rows[0];
    },

    // Find employee by CNIC
    findByCNIC: async (cnic, campus_id) => {
        const query = `
            SELECT * FROM employees 
            WHERE cnic = ? AND campus_id = ? AND deleted_at IS NULL
        `;
        const [rows] = await db.execute(query, [cnic, campus_id || 1]);
        return rows[0];
    },

    // Find employees by department
    findByDepartment: async (department_id, campus_id) => {
        const query = `
            SELECT e.*, des.name as designation_name
            FROM employees e
            LEFT JOIN designations des ON e.designation_id = des.id
            WHERE e.department_id = ? AND e.campus_id = ? 
              AND e.deleted_at IS NULL AND e.status = 'ACTIVE'
            ORDER BY e.first_name
        `;
        const [rows] = await db.execute(query, [department_id, campus_id || 1]);
        return rows;
    },

    // Find employees by designation
    findByDesignation: async (designation_id, campus_id) => {
        const query = `
            SELECT e.*, d.name as department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.designation_id = ? AND e.campus_id = ? 
              AND e.deleted_at IS NULL AND e.status = 'ACTIVE'
            ORDER BY e.first_name
        `;
        const [rows] = await db.execute(query, [designation_id, campus_id || 1]);
        return rows;
    },

    // Find employees by group
    findByGroup: async (employee_group, campus_id) => {
        const query = `
            SELECT e.*, d.name as department_name, des.name as designation_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN designations des ON e.designation_id = des.id
            WHERE e.employee_group = ? AND e.campus_id = ? 
              AND e.deleted_at IS NULL AND e.status = 'ACTIVE'
            ORDER BY e.first_name
        `;
        const [rows] = await db.execute(query, [employee_group, campus_id || 1]);
        return rows;
    },

    // Find teachers (for class assignment)
    findTeachers: async (campus_id) => {
        const query = `
            SELECT e.*, d.name as department_name, des.name as designation_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN designations des ON e.designation_id = des.id
            WHERE e.employee_group = 'TEACHING' 
              AND e.campus_id = ? 
              AND e.deleted_at IS NULL 
              AND e.status = 'ACTIVE'
            ORDER BY e.first_name
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows;
    },

    // Get all employees with pagination
    findAll: async ({ search, department_id, designation_id, employee_group, status, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `
            SELECT e.*, d.name as department_name, des.name as designation_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN designations des ON e.designation_id = des.id
            WHERE e.campus_id = ? AND e.deleted_at IS NULL
        `;
        const queryParams = [campus_id || 1];

        if (department_id) {
            query += ` AND e.department_id = ?`;
            queryParams.push(department_id);
        }

        if (designation_id) {
            query += ` AND e.designation_id = ?`;
            queryParams.push(designation_id);
        }

        if (employee_group) {
            query += ` AND e.employee_group = ?`;
            queryParams.push(employee_group);
        }

        if (status) {
            query += ` AND e.status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_code LIKE ? OR e.email LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['first_name', 'last_name', 'employee_code', 'joining_date', 'created_at'];
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

    // Count total employees
    countAll: async ({ search, department_id, designation_id, employee_group, status, campus_id }) => {
        let query = `SELECT COUNT(*) as total FROM employees WHERE campus_id = ? AND deleted_at IS NULL`;
        const queryParams = [campus_id || 1];

        if (department_id) {
            query += ` AND department_id = ?`;
            queryParams.push(department_id);
        }

        if (designation_id) {
            query += ` AND designation_id = ?`;
            queryParams.push(designation_id);
        }

        if (employee_group) {
            query += ` AND employee_group = ?`;
            queryParams.push(employee_group);
        }

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (first_name LIKE ? OR last_name LIKE ? OR employee_code LIKE ? OR email LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Update employee
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'first_name', 'last_name', 'cnic', 'email', 'phone',
            'alternative_phone', 'date_of_birth', 'gender', 'marital_status',
            'nationality', 'religion', 'current_address', 'permanent_address',
            'profile_picture', 'employee_group', 'department_id', 'designation_id',
            'joining_date', 'employment_type', 'contract_start_date',
            'contract_end_date', 'probation_period_months', 'status',
            'basic_salary', 'house_allowance', 'medical_allowance',
            'transport_allowance', 'other_allowance', 'tax_percentage',
            'bank_account_number', 'bank_name', 'emergency_contact_name',
            'emergency_contact_relationship', 'emergency_contact_phone',
            'highest_degree', 'specialization', 'years_of_experience',
            'teaching_subjects', 'is_class_teacher', 'assigned_class_id'
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
        const query = `UPDATE employees SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    // Delete employee (soft delete)
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `UPDATE employees SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    },

    // Get employee statistics
    getEmployeeStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_employees,
                SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_employees,
                SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive_employees,
                SUM(CASE WHEN status = 'ON_LEAVE' THEN 1 ELSE 0 END) as on_leave,
                SUM(CASE WHEN employee_group = 'TEACHING' THEN 1 ELSE 0 END) as teachers,
                SUM(CASE WHEN employee_group = 'ADMINISTRATIVE' THEN 1 ELSE 0 END) as admin_staff,
                SUM(CASE WHEN employee_group = 'SUPPORT' THEN 1 ELSE 0 END) as support_staff,
                SUM(CASE WHEN employee_group = 'MANAGEMENT' THEN 1 ELSE 0 END) as management,
                SUM(CASE WHEN is_class_teacher = TRUE THEN 1 ELSE 0 END) as class_teachers,
                ROUND(AVG(basic_salary), 0) as avg_salary
            FROM employees
            WHERE campus_id = ? AND deleted_at IS NULL
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    },

    // Get employee by user ID (for auth integration)
    findByUserId: async (user_id) => {
        const query = `
            SELECT * FROM employees 
            WHERE user_id = ? AND deleted_at IS NULL
        `;
        const [rows] = await db.execute(query, [user_id]);
        return rows[0];
    }
};

module.exports = employeeRepository;