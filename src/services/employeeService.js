// ============================================
// FILE: src/services/employeeService.js
// PURPOSE: Business logic for employees
// ============================================

const employeeRepository = require('../repositories/employeeRepository');
const departmentRepository = require('../repositories/departmentRepository');
const designationRepository = require('../repositories/designationRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const employeeService = {
    // Create employee
    createEmployee: async (employeeData, actor) => {
        const {
            employee_code, first_name, last_name, email, phone,
            employee_group, department_id, designation_id,
            joining_date, employment_type, basic_salary,
            campus_id
        } = employeeData;

        // Validate required fields
        if (!employee_code || !first_name || !last_name || !phone ||
            !employee_group || !department_id || !designation_id || !joining_date) {
            throw new AppError('Missing required fields. Please provide: employee_code, first_name, last_name, phone, employee_group, department_id, designation_id, joining_date', 400);
        }

        // Check duplicate employee code
        const existing = await employeeRepository.findByCode(employee_code, campus_id);
        if (existing) {
            throw new AppError('Employee code already exists', 400);
        }

        // Check duplicate email
        if (email) {
            // Simple check - in production use a proper email validation
            const [rows] = await dbPool.execute(
                'SELECT id FROM employees WHERE email = ? AND deleted_at IS NULL',
                [email]
            );
            if (rows.length > 0) {
                throw new AppError('Email already exists', 400);
            }
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            const result = await employeeRepository.create({
                ...employeeData,
                campus_id: campus_id || 1,
                created_by: actor.user_id
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'EMPLOYEE_CREATE',
                entity_name: 'employees',
                entity_id: result.insertId,
                new_values: employeeData,
                ip_address: actor.ip_address
            });

            return { id: result.insertId, ...employeeData };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get employees with pagination
    getEmployees: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const employees = await employeeRepository.findAll({
            search: options.search || null,
            department_id: options.department_id || null,
            designation_id: options.designation_id || null,
            employee_group: options.employee_group || null,
            status: options.status || null,
            sortBy: options.sortBy || 'first_name',
            sortOrder: options.sortOrder || 'ASC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = await employeeRepository.countAll({
            search: options.search || null,
            department_id: options.department_id || null,
            designation_id: options.designation_id || null,
            employee_group: options.employee_group || null,
            status: options.status || null,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: employees,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages
            }
        };
    },

    // Get employee by ID
    getEmployeeById: async (id) => {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }
        return employee;
    },

    // Get teachers (for dropdown)
    getTeachers: async (campus_id) => {
        return await employeeRepository.findTeachers(campus_id || 1);
    },

    // Get employees by department
    getEmployeesByDepartment: async (department_id, campus_id) => {
        return await employeeRepository.findByDepartment(department_id, campus_id || 1);
    },

    // Get employees by designation
    getEmployeesByDesignation: async (designation_id, campus_id) => {
        return await employeeRepository.findByDesignation(designation_id, campus_id || 1);
    },

    // Get employee statistics
    getEmployeeStats: async (campus_id) => {
        return await employeeRepository.getEmployeeStats(campus_id || 1);
    },

    // Update employee
    updateEmployee: async (id, updateData, actor) => {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }

        // Check duplicate email (if changing)
        if (updateData.email && updateData.email !== employee.email) {
            const [rows] = await dbPool.execute(
                'SELECT id FROM employees WHERE email = ? AND id != ? AND deleted_at IS NULL',
                [updateData.email, id]
            );
            if (rows.length > 0) {
                throw new AppError('Email already exists', 400);
            }
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await employeeRepository.update(id, updateData, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'EMPLOYEE_UPDATE',
                entity_name: 'employees',
                entity_id: parseInt(id),
                previous_values: employee,
                new_values: updateData,
                ip_address: actor.ip_address
            });

            return { id: parseInt(id), message: 'Employee updated successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Delete employee
    deleteEmployee: async (id, actor) => {
        const employee = await employeeRepository.findById(id);
        if (!employee) {
            throw new AppError('Employee not found', 404);
        }

        await employeeRepository.delete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'EMPLOYEE_DELETE',
            entity_name: 'employees',
            entity_id: parseInt(id),
            previous_values: employee,
            new_values: null,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Employee deactivated successfully' };
    }
};

module.exports = employeeService;