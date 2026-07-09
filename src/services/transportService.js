// ============================================
// FILE: src/services/transportService.js
// PURPOSE: Business logic for transport module
// ============================================

const transportRepository = require('../repositories/transportRepository');
const studentRepository = require('../repositories/studentRepository');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const transportService = {
    // ============================================
    // VEHICLE SERVICES
    // ============================================

    // ============================================
    // VEHICLE SERVICES - FIXED
    // ============================================

    createVehicle: async (vehicleData, actor) => {
        const { 
            vehicle_number, 
            vehicle_type, 
            capacity, 
            registration_number,
            company,
            model_year,
            color,
            fuel_type,
            insurance_expiry,
            fitness_expiry,
            campus_id
        } = vehicleData;

        // Validate required fields
        if (!vehicle_number) {
            throw new AppError('Vehicle number is required', 400);
        }
        if (!vehicle_type) {
            throw new AppError('Vehicle type is required', 400);
        }
        if (!capacity) {
            throw new AppError('Capacity is required', 400);
        }
        if (!registration_number) {
            throw new AppError('Registration number is required', 400);
        }

        // Check duplicate vehicle number
        const existing = await transportRepository.findVehicleByNumber(vehicle_number, campus_id || 1);
        if (existing) {
            throw new AppError('Vehicle number already exists', 400);
        }

        const result = await transportRepository.createVehicle({
            vehicle_number,
            vehicle_type,
            capacity: parseInt(capacity),
            registration_number,
            company: company || null,
            model_year: model_year || null,
            color: color || null,
            fuel_type: fuel_type || 'DIESEL',
            insurance_expiry: insurance_expiry || null,
            fitness_expiry: fitness_expiry || null,
            campus_id: campus_id || 1,
            created_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'VEHICLE_CREATE',
            entity_name: 'vehicles',
            entity_id: result.insertId,
            new_values: vehicleData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, ...vehicleData };
    },

    getVehicles: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const vehicles = await transportRepository.getAllVehicles({
            search: options.search || null,
            status: options.status || null,
            sortBy: options.sortBy || 'created_at',
            sortOrder: options.sortOrder || 'DESC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = vehicles.length; // Simplified - use count in production

        return {
            data: vehicles,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: Math.ceil(totalRecords / limit)
            }
        };
    },

    getVehicleById: async (id) => {
        const vehicle = await transportRepository.findVehicleById(id);
        if (!vehicle) {
            throw new AppError('Vehicle not found', 404);
        }
        return vehicle;
    },

    updateVehicle: async (id, updateData, actor) => {
        const vehicle = await transportRepository.findVehicleById(id);
        if (!vehicle) {
            throw new AppError('Vehicle not found', 404);
        }

        await transportRepository.updateVehicle(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'VEHICLE_UPDATE',
            entity_name: 'vehicles',
            entity_id: parseInt(id),
            previous_values: vehicle,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Vehicle updated successfully' };
    },

    // ============================================
    // DRIVER SERVICES
    // ============================================

    createDriver: async (driverData, actor) => {
        const { driver_code, full_name, phone, license_number, license_expiry, hire_date } = driverData;

        if (!driver_code || !full_name || !phone || !license_number || !license_expiry || !hire_date) {
            throw new AppError('Driver code, full name, phone, license number, license expiry, and hire date are required', 400);
        }

        const result = await transportRepository.createDriver({
            ...driverData,
            created_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'DRIVER_CREATE',
            entity_name: 'drivers',
            entity_id: result.insertId,
            new_values: driverData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, ...driverData };
    },

    getDrivers: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const drivers = await transportRepository.getAllDrivers({
            search: options.search || null,
            status: options.status || null,
            sortBy: options.sortBy || 'created_at',
            sortOrder: options.sortOrder || 'DESC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        return {
            data: drivers,
            pagination: {
                page,
                limit,
                total_records: drivers.length,
                total_pages: Math.ceil(drivers.length / limit)
            }
        };
    },

    getDriverById: async (id) => {
        const driver = await transportRepository.findDriverById(id);
        if (!driver) {
            throw new AppError('Driver not found', 404);
        }
        return driver;
    },

    updateDriver: async (id, updateData, actor) => {
        const driver = await transportRepository.findDriverById(id);
        if (!driver) {
            throw new AppError('Driver not found', 404);
        }

        await transportRepository.updateDriver(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'DRIVER_UPDATE',
            entity_name: 'drivers',
            entity_id: parseInt(id),
            previous_values: driver,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Driver updated successfully' };
    },

    // ============================================
    // ROUTE SERVICES
    // ============================================

    createRoute: async (routeData, actor) => {
        const { route_code, route_name, start_location, end_location } = routeData;

        if (!route_code || !route_name || !start_location || !end_location) {
            throw new AppError('Route code, name, start, and end locations are required', 400);
        }

        const result = await transportRepository.createRoute({
            ...routeData,
            created_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'ROUTE_CREATE',
            entity_name: 'routes',
            entity_id: result.insertId,
            new_values: routeData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, ...routeData };
    },

    getRoutes: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const routes = await transportRepository.getAllRoutes({
            search: options.search || null,
            status: options.status || null,
            sortBy: options.sortBy || 'created_at',
            sortOrder: options.sortOrder || 'DESC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        return {
            data: routes,
            pagination: {
                page,
                limit,
                total_records: routes.length,
                total_pages: Math.ceil(routes.length / limit)
            }
        };
    },

    getRouteById: async (id) => {
        const route = await transportRepository.findRouteById(id);
        if (!route) {
            throw new AppError('Route not found', 404);
        }
        return route;
    },

    updateRoute: async (id, updateData, actor) => {
        const route = await transportRepository.findRouteById(id);
        if (!route) {
            throw new AppError('Route not found', 404);
        }

        await transportRepository.updateRoute(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'ROUTE_UPDATE',
            entity_name: 'routes',
            entity_id: parseInt(id),
            previous_values: route,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Route updated successfully' };
    },

    // ============================================
    // STUDENT TRANSPORT SERVICES
    // ============================================

    // ============================================
    // STUDENT TRANSPORT SERVICES - FIXED
    // ============================================

    assignStudentTransport: async (assignmentData, actor) => {
        const { 
            student_id, 
            route_id, 
            stop_id, 
            vehicle_route_id, 
            pickup_time, 
            dropoff_time, 
            start_date,
            fee_amount,
            end_date,
            campus_id
        } = assignmentData;

        // Validate required fields
        const missingFields = [];
        if (!student_id) missingFields.push('student_id');
        if (!route_id) missingFields.push('route_id');
        if (!stop_id) missingFields.push('stop_id');
        if (!vehicle_route_id) missingFields.push('vehicle_route_id');
        if (!pickup_time) missingFields.push('pickup_time');
        if (!dropoff_time) missingFields.push('dropoff_time');
        if (!start_date) missingFields.push('start_date');

        if (missingFields.length > 0) {
            throw new AppError(`Missing required fields: ${missingFields.join(', ')}`, 400);
        }

        // Validate student exists
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        const result = await transportRepository.assignStudentTransport({
            student_id: parseInt(student_id),
            route_id: parseInt(route_id),
            stop_id: parseInt(stop_id),
            vehicle_route_id: parseInt(vehicle_route_id),
            pickup_time: pickup_time,
            dropoff_time: dropoff_time,
            fee_amount: fee_amount || 0,
            start_date: start_date,
            end_date: end_date || null,
            campus_id: campus_id || 1,
            created_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'STUDENT_TRANSPORT_ASSIGN',
            entity_name: 'student_transport',
            entity_id: result.insertId,
            new_values: assignmentData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, ...assignmentData };
    },

    getStudentTransport: async (student_id) => {
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        return await transportRepository.findStudentTransport(student_id);
    },

    markAttendance: async (attendanceData, actor) => {
        const { student_transport_id, attendance_date, status } = attendanceData;

        if (!student_transport_id || !attendance_date || !status) {
            throw new AppError('Student transport ID, attendance date, and status are required', 400);
        }

        const result = await transportRepository.markTransportAttendance({
            ...attendanceData,
            marked_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'TRANSPORT_ATTENDANCE',
            entity_name: 'transport_attendance',
            entity_id: result.insertId,
            new_values: attendanceData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, message: 'Transport attendance marked successfully' };
    },

    // ============================================
    // STATISTICS SERVICES
    // ============================================

    getTransportStats: async (campus_id) => {
        return await transportRepository.getTransportStats(campus_id || 1);
    }
};

module.exports = transportService;