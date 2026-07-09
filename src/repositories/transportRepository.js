// ============================================
// FILE: src/repositories/transportRepository.js
// PURPOSE: Database operations for transport
// ============================================

const db = require('../config/db');

const transportRepository = {
    // ============================================
    // VEHICLE OPERATIONS
    // ============================================

    // ============================================
    // VEHICLE OPERATIONS - FIXED
    // ============================================

    createVehicle: async (vehicleData, connection = null) => {
        const client = connection || db;
        const {
            vehicle_number = null,
            vehicle_type = null,
            capacity = null,
            registration_number = null,
            company = null,
            model_year = null,
            color = null,
            fuel_type = 'DIESEL',
            status = 'ACTIVE',
            insurance_expiry = null,
            fitness_expiry = null,
            last_maintenance = null,
            remarks = null,
            campus_id = 1,
            created_by = null
        } = vehicleData;

        // Validate required fields
        if (!vehicle_number) throw new Error('vehicle_number is required');
        if (!vehicle_type) throw new Error('vehicle_type is required');
        if (!capacity) throw new Error('capacity is required');
        if (!registration_number) throw new Error('registration_number is required');

        const query = `
            INSERT INTO vehicles (
                vehicle_number, vehicle_type, capacity, registration_number,
                company, model_year, color, fuel_type, status,
                insurance_expiry, fitness_expiry, last_maintenance, remarks,
                campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            vehicle_number,
            vehicle_type,
            capacity,
            registration_number,
            company,
            model_year,
            color,
            fuel_type,
            status,
            insurance_expiry,
            fitness_expiry,
            last_maintenance,
            remarks,
            campus_id,
            created_by
        ]);
        return result;
    },

    findVehicleById: async (id) => {
        const query = `SELECT * FROM vehicles WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    findVehicleByNumber: async (vehicle_number, campus_id) => {
        const query = `SELECT * FROM vehicles WHERE vehicle_number = ? AND campus_id = ?`;
        const [rows] = await db.execute(query, [vehicle_number, campus_id || 1]);
        return rows[0];
    },

    getAllVehicles: async ({ search, status, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `SELECT * FROM vehicles WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (vehicle_number LIKE ? OR registration_number LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['vehicle_number', 'vehicle_type', 'capacity', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    updateVehicle: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'vehicle_number', 'vehicle_type', 'capacity', 'registration_number',
            'company', 'model_year', 'color', 'fuel_type', 'status',
            'insurance_expiry', 'fitness_expiry', 'last_maintenance', 'remarks'
        ];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (fields.length === 0) return { affectedRows: 0 };

        values.push(id);
        const query = `UPDATE vehicles SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    // ============================================
    // DRIVER OPERATIONS
    // ============================================

    createDriver: async (driverData, connection = null) => {
        const client = connection || db;
        const {
            driver_code, full_name, cnic, phone, alternative_phone,
            license_number, license_expiry, hire_date, status = 'ACTIVE',
            address, emergency_contact_name, emergency_contact_phone,
            salary, remarks, campus_id = 1, created_by = null
        } = driverData;

        const query = `
            INSERT INTO drivers (
                driver_code, full_name, cnic, phone, alternative_phone,
                license_number, license_expiry, hire_date, status,
                address, emergency_contact_name, emergency_contact_phone,
                salary, remarks, campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            driver_code, full_name, cnic, phone, alternative_phone,
            license_number, license_expiry, hire_date, status,
            address, emergency_contact_name, emergency_contact_phone,
            salary, remarks, campus_id, created_by
        ]);
        return result;
    },

    findDriverById: async (id) => {
        const query = `SELECT * FROM drivers WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    getAllDrivers: async ({ search, status, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `SELECT * FROM drivers WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (full_name LIKE ? OR driver_code LIKE ? OR phone LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['full_name', 'driver_code', 'hire_date', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // ============================================
    // ROUTE OPERATIONS
    // ============================================

    createRoute: async (routeData, connection = null) => {
        const client = connection || db;
        const {
            route_code, route_name, start_location, end_location,
            distance_km, duration_minutes, fee_amount, campus_id = 1,
            created_by = null
        } = routeData;

        const query = `
            INSERT INTO routes (
                route_code, route_name, start_location, end_location,
                distance_km, duration_minutes, fee_amount, campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            route_code, route_name, start_location, end_location,
            distance_km, duration_minutes, fee_amount, campus_id, created_by
        ]);
        return result;
    },

    findRouteById: async (id) => {
        const query = `SELECT * FROM routes WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    getAllRoutes: async ({ search, status, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `SELECT * FROM routes WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (route_code LIKE ? OR route_name LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['route_code', 'route_name', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY ${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // ============================================
    // STUDENT TRANSPORT OPERATIONS
    // ============================================

        // ============================================
    // STUDENT TRANSPORT OPERATIONS - FIXED
    // ============================================

    assignStudentTransport: async (assignmentData, connection = null) => {
        const client = connection || db;
        const {
            student_id = null,
            route_id = null,
            stop_id = null,
            vehicle_route_id = null,
            pickup_time = null,
            dropoff_time = null,
            fee_amount = 0,
            start_date = null,
            end_date = null,
            campus_id = 1,
            created_by = null
        } = assignmentData;

        // Validate required fields
        if (!student_id) throw new Error('student_id is required');
        if (!route_id) throw new Error('route_id is required');
        if (!stop_id) throw new Error('stop_id is required');
        if (!vehicle_route_id) throw new Error('vehicle_route_id is required');
        if (!pickup_time) throw new Error('pickup_time is required');
        if (!dropoff_time) throw new Error('dropoff_time is required');
        if (!start_date) throw new Error('start_date is required');

        const query = `
            INSERT INTO student_transport (
                student_id, route_id, stop_id, vehicle_route_id,
                pickup_time, dropoff_time, fee_amount, start_date,
                end_date, campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            student_id,
            route_id,
            stop_id,
            vehicle_route_id,
            pickup_time,
            dropoff_time,
            fee_amount || 0,
            start_date,
            end_date || null,
            campus_id || 1,
            created_by || null
        ]);
        return result;
    },

    findStudentTransport: async (student_id, academic_session_id) => {
        const query = `
            SELECT st.*, r.route_name, r.route_code, rs.stop_name,
                   v.vehicle_number, v.vehicle_type,
                   d.full_name as driver_name
            FROM student_transport st
            JOIN routes r ON st.route_id = r.id
            JOIN route_stops rs ON st.stop_id = rs.id
            JOIN vehicle_routes vr ON st.vehicle_route_id = vr.id
            JOIN vehicles v ON vr.vehicle_id = v.id
            JOIN drivers d ON vr.driver_id = d.id
            WHERE st.student_id = ? AND st.status = 'ACTIVE'
        `;
        const [rows] = await db.execute(query, [student_id]);
        return rows[0];
    },

    // ============================================
    // ROUTE STOPS OPERATIONS
    // ============================================

    createRouteStop: async (stopData, connection = null) => {
        const client = connection || db;
        const {
            route_id, stop_name, stop_order, latitude, longitude,
            address, pick_up_time, drop_off_time, distance_from_start
        } = stopData;

        const query = `
            INSERT INTO route_stops (
                route_id, stop_name, stop_order, latitude, longitude,
                address, pick_up_time, drop_off_time, distance_from_start
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            route_id, stop_name, stop_order, latitude, longitude,
            address, pick_up_time, drop_off_time, distance_from_start
        ]);
        return result;
    },

    getRouteStops: async (route_id) => {
        const query = `
            SELECT * FROM route_stops 
            WHERE route_id = ? AND is_active = TRUE
            ORDER BY stop_order
        `;
        const [rows] = await db.execute(query, [route_id]);
        return rows;
    },

    // ============================================
    // TRANSPORT ATTENDANCE
    // ============================================

    markTransportAttendance: async (attendanceData, connection = null) => {
        const client = connection || db;
        const {
            student_transport_id, attendance_date, pickup_time,
            dropoff_time, status, remarks, marked_by, campus_id = 1
        } = attendanceData;

        const query = `
            INSERT INTO transport_attendance (
                student_transport_id, attendance_date, pickup_time,
                dropoff_time, status, remarks, marked_by, campus_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                pickup_time = VALUES(pickup_time),
                dropoff_time = VALUES(dropoff_time),
                status = VALUES(status),
                remarks = VALUES(remarks),
                updated_at = CURRENT_TIMESTAMP
        `;

        const [result] = await client.execute(query, [
            student_transport_id, attendance_date, pickup_time,
            dropoff_time, status, remarks, marked_by, campus_id
        ]);
        return result;
    },

    // ============================================
    // STATISTICS
    // ============================================

    getTransportStats: async (campus_id) => {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM vehicles WHERE campus_id = ?) as total_vehicles,
                (SELECT COUNT(*) FROM vehicles WHERE campus_id = ? AND status = 'ACTIVE') as active_vehicles,
                (SELECT COUNT(*) FROM drivers WHERE campus_id = ? AND status = 'ACTIVE') as active_drivers,
                (SELECT COUNT(*) FROM routes WHERE campus_id = ? AND status = 'ACTIVE') as active_routes,
                (SELECT COUNT(*) FROM student_transport WHERE campus_id = ? AND status = 'ACTIVE') as students_on_transport
        `;
        const [rows] = await db.execute(query, [
            campus_id || 1, campus_id || 1, campus_id || 1,
            campus_id || 1, campus_id || 1
        ]);
        return rows[0];
    }
};

module.exports = transportRepository;