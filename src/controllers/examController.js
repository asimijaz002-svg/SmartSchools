// ============================================
// FILE: src/controllers/examController.js
// PURPOSE: Request/Response handlers for exams
// ============================================

const examService = require('../services/examService');
const examMarksService = require('../services/examMarksService');
const AppError = require('../utils/appError');

const examController = {
    // Create exam
    createExam: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await examService.createExam({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Exam created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all exams
    getExams: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await examService.getExams({
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

    // Get single exam
    getExam: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await examService.getExamById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get exams by class
    getExamsByClass: async (req, res, next) => {
        try {
            const { class_id } = req.params;
            const { academic_session_id } = req.query;
            const result = await examService.getExamsByClass(class_id, academic_session_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get exam statistics
    getExamStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await examService.getExamStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Update exam
    updateExam: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await examService.updateExam(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Exam updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Delete exam
    deleteExam: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await examService.deleteExam(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Exam deleted successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = examController;