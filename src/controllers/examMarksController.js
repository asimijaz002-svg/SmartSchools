// ============================================
// FILE: src/controllers/examMarksController.js
// PURPOSE: Request/Response handlers for exam marks
// ============================================

const examMarksService = require('../services/examMarksService');
const AppError = require('../utils/appError');

const examMarksController = {
    // Enter marks for a single student
    enterMarks: async (req, res, next) => {
        try {
            const { exam_id } = req.params;
            const result = await examMarksService.enterMarks(
                exam_id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Marks entered successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Bulk enter marks
    bulkEnterMarks: async (req, res, next) => {
        try {
            const { exam_id } = req.params;
            const { marks } = req.body;

            if (!marks || marks.length === 0) {
                return next(new AppError('Marks array is required', 400));
            }

            const result = await examMarksService.bulkEnterMarks(
                exam_id,
                marks,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Marks entered successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get marks by exam
    getMarksByExam: async (req, res, next) => {
        try {
            const { exam_id } = req.params;
            const result = await examMarksService.getMarksByExam(exam_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get marks by student
    getMarksByStudent: async (req, res, next) => {
        try {
            const { student_id } = req.params;
            const { academic_session_id } = req.query;

            if (!academic_session_id) {
                return next(new AppError('academic_session_id is required', 400));
            }

            const result = await examMarksService.getMarksByStudent(student_id, academic_session_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get exam summary
    getExamSummary: async (req, res, next) => {
        try {
            const { exam_id } = req.params;
            const result = await examMarksService.getExamSummary(exam_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Verify marks and publish exam
    verifyMarks: async (req, res, next) => {
        try {
            const { exam_id } = req.params;
            const result = await examMarksService.verifyMarks(
                exam_id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Marks verified and exam published successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get student rank
    getStudentRank: async (req, res, next) => {
        try {
            const { exam_id, student_id } = req.params;
            const result = await examMarksService.getStudentRank(exam_id, student_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = examMarksController;