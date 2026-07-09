// ============================================
// FILE: src/controllers/sessionController.js
// PURPOSE: Request/Response handlers for academic sessions
// ============================================

const sessionService = require('../services/sessionService');
const AppError = require('../utils/appError');

const sessionController = {
    // Create new session
    createSession: async (req, res, next) => {
        try {
            const { name, start_date, end_date, is_active } = req.body;
            const campus_id = req.campusId;

            if (!name || !start_date || !end_date) {
                return next(new AppError('Name, start_date, and end_date are required', 400));
            }

            const result = await sessionService.createSession({
                name,
                start_date,
                end_date,
                is_active,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Academic session created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all sessions with pagination
    getSessions: async (req, res, next) => {
        try {
            const result = await sessionService.getSessions(req.query);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get single session
    getSession: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await sessionService.getSessionById(id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get active session
    getActiveSession: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await sessionService.getActiveSession(campus_id);
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Update session
    updateSession: async (req, res, next) => {
        try {
            const { id } = req.params;
            const updateData = req.body;

            const result = await sessionService.updateSession(
                id,
                updateData,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Session updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Delete session
    deleteSession: async (req, res, next) => {
        try {
            const { id } = req.params;

            const result = await sessionService.deleteSession(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Session deleted successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Activate a session
    activateSession: async (req, res, next) => {
        try {
            const { id } = req.params;

            const result = await sessionService.activateSession(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Session activated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = sessionController;