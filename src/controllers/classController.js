// ============================================
// FILE: src/controllers/classController.js
// PURPOSE: Request/Response handlers for classes
// ============================================

const classService = require('../services/classService');
const AppError = require('../utils/appError');

const classController = {
    // Create new class
    createClass: async (req, res, next) => {
        try {
            const { name, section, class_teacher_id, academic_session_id } = req.body;
            const campus_id = req.campusId;

            if (!name || !academic_session_id) {
                return next(new AppError('Name and academic_session_id are required', 400));
            }

            const result = await classService.createClass({
                name,
                section,
                class_teacher_id,
                academic_session_id,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Class created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all classes with pagination
    getClasses: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await classService.getClasses({
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

    // Get single class
    getClass: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await classService.getClassById(id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get classes with student counts (for reporting)
    getClassesWithCounts: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const { academic_session_id } = req.query;
            const result = await classService.getClassesWithCounts({
                academic_session_id,
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

    // Update class
    updateClass: async (req, res, next) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const result = await classService.updateClass(
                id,
                updateData,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Class updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Delete class
    deleteClass: async (req, res, next) => {
        try {
            const { id } = req.params;

            const result = await classService.deleteClass(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Class deleted successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = classController;