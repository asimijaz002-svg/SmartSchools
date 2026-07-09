// ============================================
// FILE: src/services/sessionService.js
// PURPOSE: Business logic for academic sessions
// ============================================

const sessionRepository = require('../repositories/sessionRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const sessionService = {
    // Create new academic session
    createSession: async (sessionData, actor) => {
        const { name, start_date, end_date, is_active, campus_id } = sessionData;

        // Validate dates
        if (new Date(start_date) > new Date(end_date)) {
            throw new AppError('Start date cannot be after end date', 400);
        }

        // Check duplicate name
        const existing = await sessionRepository.findByName(name, campus_id);
        if (existing) {
            throw new AppError('Academic session with this name already exists', 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // If this session is active, deactivate all others
            if (is_active) {
                await sessionRepository.deactivateAllSessions(connection);
            }

            const result = await sessionRepository.create({
                name,
                start_date,
                end_date,
                is_active: is_active || false,
                campus_id: campus_id || 1
            }, connection);

            await connection.commit();

            // Audit log
            await auditService.log({
                user_id: actor.user_id,
                action: 'SESSION_CREATE',
                entity_name: 'academic_sessions',
                entity_id: result.insertId,
                previous_values: null,
                new_values: sessionData,
                ip_address: actor.ip_address
            });

            return { id: result.insertId, ...sessionData };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get all sessions with pagination
    getSessions: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const allowedSortFields = ['name', 'start_date', 'end_date', 'is_active', 'created_at'];
        const sortBy = allowedSortFields.includes(options.sortBy) ? options.sortBy : 'created_at';
        const sortOrder = (options.sortOrder && options.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

        const sessions = await sessionRepository.findAll({
            search: options.search || null,
            is_active: options.is_active !== undefined ? options.is_active : null,
            sortBy,
            sortOrder,
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = await sessionRepository.countAll({
            search: options.search || null,
            is_active: options.is_active !== undefined ? options.is_active : null,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: sessions,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages
            }
        };
    },

    // Get session by ID
    getSessionById: async (id) => {
        const session = await sessionRepository.findById(id);
        if (!session) {
            throw new AppError('Academic session not found', 404);
        }
        return session;
    },

    // Get active session
    getActiveSession: async (campus_id) => {
        const session = await sessionRepository.getActiveSession(campus_id);
        if (!session) {
            throw new AppError('No active academic session found. Please contact administrator.', 404);
        }
        return session;
    },

    // Update session
    updateSession: async (id, updateData, actor) => {
        const session = await sessionRepository.findById(id);
        if (!session) {
            throw new AppError('Academic session not found', 404);
        }

        // Check if session has students before allowing changes
        if (updateData.is_active === false && session.is_active === true) {
            const hasStudents = await sessionRepository.hasStudents(id);
            if (hasStudents) {
                throw new AppError('Cannot deactivate session with enrolled students. Please transfer students first.', 400);
            }
        }

        // Validate dates
        const startDate = updateData.start_date || session.start_date;
        const endDate = updateData.end_date || session.end_date;
        if (new Date(startDate) > new Date(endDate)) {
            throw new AppError('Start date cannot be after end date', 400);
        }

        // Check duplicate name (if name is changing)
        if (updateData.name && updateData.name !== session.name) {
            const existing = await sessionRepository.findByName(updateData.name, session.campus_id);
            if (existing && existing.id !== parseInt(id)) {
                throw new AppError('Academic session with this name already exists', 400);
            }
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // If activating this session, deactivate all others
            if (updateData.is_active === true) {
                await sessionRepository.deactivateAllSessions(connection);
            }

            const result = await sessionRepository.update(id, {
                name: updateData.name || session.name,
                start_date: updateData.start_date || session.start_date,
                end_date: updateData.end_date || session.end_date,
                is_active: updateData.is_active !== undefined ? updateData.is_active : session.is_active
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'SESSION_UPDATE',
                entity_name: 'academic_sessions',
                entity_id: parseInt(id),
                previous_values: session,
                new_values: updateData,
                ip_address: actor.ip_address
            });

            return { id: parseInt(id), message: 'Session updated successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Delete session
    deleteSession: async (id, actor) => {
        const session = await sessionRepository.findById(id);
        if (!session) {
            throw new AppError('Academic session not found', 404);
        }

        // Check if session has students
        const hasStudents = await sessionRepository.hasStudents(id);
        if (hasStudents) {
            throw new AppError('Cannot delete session with enrolled students. Please transfer students first.', 400);
        }

        // Check if session has classes
        const hasClasses = await sessionRepository.hasClasses(id);
        if (hasClasses) {
            throw new AppError('Cannot delete session with assigned classes. Please remove classes first.', 400);
        }

        // Prevent deletion of active session
        if (session.is_active) {
            throw new AppError('Cannot delete active session. Please activate another session first.', 400);
        }

        await sessionRepository.delete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'SESSION_DELETE',
            entity_name: 'academic_sessions',
            entity_id: parseInt(id),
            previous_values: session,
            new_values: null,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Session deleted successfully' };
    },

    // Activate a session
    activateSession: async (id, actor) => {
        const session = await sessionRepository.findById(id);
        if (!session) {
            throw new AppError('Academic session not found', 404);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();
            
            await sessionRepository.activateSession(id, connection);
            
            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'SESSION_ACTIVATE',
                entity_name: 'academic_sessions',
                entity_id: parseInt(id),
                previous_values: { is_active: session.is_active },
                new_values: { is_active: true },
                ip_address: actor.ip_address
            });

            return { id: parseInt(id), message: 'Session activated successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = sessionService;