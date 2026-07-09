// ============================================
// FILE: src/controllers/guardianController.js
// PURPOSE: Request/Response handlers for student guardians
// ============================================

const guardianService = require('../services/guardianService');
const AppError = require('../utils/appError');

const guardianController = {
    // Create new guardian
    createGuardian: async (req, res, next) => {
        try {
            const { student_id, guardian_type_id, full_name, contact_number } = req.body;

            if (!student_id || !guardian_type_id || !full_name || !contact_number) {
                return next(new AppError('Missing required fields: student_id, guardian_type_id, full_name, contact_number', 400));
            }

            const result = await guardianService.createGuardian(
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(201).json({
                success: true,
                message: 'Guardian added successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all guardians for a student
    getGuardiansByStudent: async (req, res, next) => {
        try {
            const { student_id } = req.params;
            const result = await guardianService.getGuardiansByStudent(student_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get single guardian by ID
    getGuardianById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await guardianService.getGuardianById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get guardian types (for dropdown)
    getGuardianTypes: async (req, res, next) => {
        try {
            const result = await guardianService.getGuardianTypes();

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Update guardian
    updateGuardian: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await guardianService.updateGuardian(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Guardian updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Delete guardian
    deleteGuardian: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await guardianService.deleteGuardian(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Guardian deleted successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = guardianController;