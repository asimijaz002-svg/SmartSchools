// ============================================
// FILE: src/controllers/dashboardController.js
// PURPOSE: Request/Response handlers for dashboard
// ============================================

const dashboardService = require('../services/dashboardService');
const AppError = require('../utils/appError');

const dashboardController = {
    // Get admin dashboard
    getAdminDashboard: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await dashboardService.getAdminDashboard(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get teacher dashboard
    getTeacherDashboard: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const teacher_id = req.user.id; // Assuming user id maps to teacher
            const result = await dashboardService.getTeacherDashboard(teacher_id, campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get parent dashboard
    getParentDashboard: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const { student_id } = req.params;
            const result = await dashboardService.getParentDashboard(student_id, campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = dashboardController;