// ============================================
// FILE: src/controllers/employeeController.js
// PURPOSE: Request/Response handlers for employees
// ============================================

const employeeService = require('../services/employeeService');
const AppError = require('../utils/appError');

const employeeController = {
    // Create employee
    createEmployee: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await employeeService.createEmployee({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Employee created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all employees
    getEmployees: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await employeeService.getEmployees({
                ...req.query,
                campus_id
            });

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get single employee
    getEmployee: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await employeeService.getEmployeeById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get teachers (for dropdown)
    getTeachers: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await employeeService.getTeachers(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get employees by department
    getByDepartment: async (req, res, next) => {
        try {
            const { department_id } = req.params;
            const campus_id = req.campusId;
            const result = await employeeService.getEmployeesByDepartment(department_id, campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get employees by designation
    getByDesignation: async (req, res, next) => {
        try {
            const { designation_id } = req.params;
            const campus_id = req.campusId;
            const result = await employeeService.getEmployeesByDesignation(designation_id, campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get employee statistics
    getEmployeeStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await employeeService.getEmployeeStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Update employee
    updateEmployee: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await employeeService.updateEmployee(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Employee updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Delete employee
    deleteEmployee: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await employeeService.deleteEmployee(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Employee deactivated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = employeeController;