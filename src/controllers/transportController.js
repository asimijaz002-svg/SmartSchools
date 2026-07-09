// ============================================
// FILE: src/controllers/transportController.js
// PURPOSE: Request/Response handlers for transport
// ============================================

const transportService = require('../services/transportService');
const AppError = require('../utils/appError');

const transportController = {
    // ============================================
    // VEHICLE CONTROLLERS
    // ============================================

    createVehicle: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.createVehicle({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Vehicle created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getVehicles: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.getVehicles({
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

    getVehicle: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await transportService.getVehicleById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateVehicle: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await transportService.updateVehicle(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Vehicle updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // DRIVER CONTROLLERS
    // ============================================

    createDriver: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.createDriver({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Driver created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getDrivers: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.getDrivers({
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

    getDriver: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await transportService.getDriverById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateDriver: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await transportService.updateDriver(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Driver updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // ROUTE CONTROLLERS
    // ============================================

    createRoute: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.createRoute({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Route created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getRoutes: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.getRoutes({
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

    getRoute: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await transportService.getRouteById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateRoute: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await transportService.updateRoute(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Route updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // STUDENT TRANSPORT CONTROLLERS
    // ============================================

    assignStudent: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.assignStudentTransport({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Student assigned to transport successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getStudentTransport: async (req, res, next) => {
        try {
            const { student_id } = req.params;
            const result = await transportService.getStudentTransport(student_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    markAttendance: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.markAttendance({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Transport attendance marked successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // STATISTICS CONTROLLER
    // ============================================

    getTransportStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await transportService.getTransportStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = transportController;