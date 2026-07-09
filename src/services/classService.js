// ============================================
// FILE: src/services/classService.js
// PURPOSE: Business logic for classes
// ============================================

const classRepository = require('../repositories/classRepository');
const sessionRepository = require('../repositories/sessionRepository');
const userRepository = require('../repositories/userRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const classService = {
    // Create new class
    createClass: async (classData, actor) => {
        const { name, section, class_teacher_id, academic_session_id, campus_id } = classData;

        // Validate academic session exists
        const session = await sessionRepository.findById(academic_session_id);
        if (!session) {
            throw new AppError('Invalid academic session. Please select a valid session.', 400);
        }

        // Validate teacher exists (if provided)
        if (class_teacher_id) {
            const teacher = await userRepository.findById(class_teacher_id);
            if (!teacher) {
                throw new AppError('Invalid teacher selected. Please select a valid teacher.', 400);
            }
            // Check if user has teacher role
            if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
                throw new AppError('Selected user is not a teacher.', 400);
            }
        }

        // Check duplicate class
        const existing = await classRepository.findByNameAndSection({
            name,
            section: section || null,
            academic_session_id,
            campus_id: campus_id || 1
        });
        if (existing) {
            throw new AppError('This class already exists in the selected academic session.', 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            const result = await classRepository.create({
                name,
                section: section || null,
                class_teacher_id: class_teacher_id || null,
                academic_session_id,
                campus_id: campus_id || 1
            }, connection);

            await connection.commit();

            // Audit log
            await auditService.log({
                user_id: actor.user_id,
                action: 'CLASS_CREATE',
                entity_name: 'classes',
                entity_id: result.insertId,
                previous_values: null,
                new_values: classData,
                ip_address: actor.ip_address
            });

            return { id: result.insertId, ...classData };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get all classes with pagination
    getClasses: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        // If no session provided, try to get active session
        let academicSessionId = options.academic_session_id;
        if (!academicSessionId) {
            const activeSession = await sessionRepository.getActiveSession(options.campus_id || 1);
            academicSessionId = activeSession ? activeSession.id : null;
        }

        const classes = await classRepository.findAll({
            search: options.search || null,
            academic_session_id: academicSessionId,
            sortBy: options.sortBy || 'name',
            sortOrder: options.sortOrder || 'ASC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        // Get student counts for each class
        const classesWithCounts = await Promise.all(classes.map(async (cls) => {
            const count = await classRepository.getStudentCount(
                cls.id, 
                academicSessionId, 
                options.campus_id || 1
            );
            return { ...cls, student_count: count };
        }));

        const totalRecords = await classRepository.countAll({
            search: options.search || null,
            academic_session_id: academicSessionId,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: classesWithCounts,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages,
                academic_session_id: academicSessionId
            }
        };
    },

    // Get class by ID
    getClassById: async (id) => {
        const cls = await classRepository.findById(id);
        if (!cls) {
            throw new AppError('Class not found', 404);
        }
        return cls;
    },

    // Update class
    updateClass: async (id, updateData, actor) => {
        const cls = await classRepository.findById(id);
        if (!cls) {
            throw new AppError('Class not found', 404);
        }

        // Validate academic session exists (if provided)
        if (updateData.academic_session_id) {
            const session = await sessionRepository.findById(updateData.academic_session_id);
            if (!session) {
                throw new AppError('Invalid academic session.', 400);
            }
        }

        // Validate teacher exists (if provided)
        if (updateData.class_teacher_id) {
            const teacher = await userRepository.findById(updateData.class_teacher_id);
            if (!teacher) {
                throw new AppError('Invalid teacher selected.', 400);
            }
            if (teacher.role !== 'teacher' && teacher.role !== 'admin') {
                throw new AppError('Selected user is not a teacher.', 400);
            }
        }

        // Check duplicate (if name or section is changing)
        if (updateData.name || updateData.section) {
            const existing = await classRepository.findByNameAndSection({
                name: updateData.name || cls.name,
                section: updateData.section !== undefined ? updateData.section : cls.section,
                academic_session_id: updateData.academic_session_id || cls.academic_session_id,
                campus_id: cls.campus_id
            });
            if (existing && existing.id !== parseInt(id)) {
                throw new AppError('This class already exists in the selected academic session.', 400);
            }
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await classRepository.update(id, {
                name: updateData.name || cls.name,
                section: updateData.section !== undefined ? updateData.section : cls.section,
                class_teacher_id: updateData.class_teacher_id !== undefined ? updateData.class_teacher_id : cls.class_teacher_id,
                academic_session_id: updateData.academic_session_id || cls.academic_session_id
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'CLASS_UPDATE',
                entity_name: 'classes',
                entity_id: parseInt(id),
                previous_values: cls,
                new_values: updateData,
                ip_address: actor.ip_address
            });

            return { id: parseInt(id), message: 'Class updated successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Delete class
    deleteClass: async (id, actor) => {
        const cls = await classRepository.findById(id);
        if (!cls) {
            throw new AppError('Class not found', 404);
        }

        // Check if class has students
        const hasStudents = await classRepository.hasStudents(id);
        if (hasStudents) {
            throw new AppError('Cannot delete class with enrolled students. Please transfer students first.', 400);
        }

        await classRepository.delete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'CLASS_DELETE',
            entity_name: 'classes',
            entity_id: parseInt(id),
            previous_values: cls,
            new_values: null,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Class deleted successfully' };
    },

    // Get classes by session with student counts
    getClassesWithCounts: async ({ academic_session_id, campus_id }) => {
        if (!academic_session_id) {
            const activeSession = await sessionRepository.getActiveSession(campus_id || 1);
            academic_session_id = activeSession ? activeSession.id : null;
        }

        if (!academic_session_id) {
            throw new AppError('No active academic session found.', 404);
        }

        return await classRepository.findAllWithCounts({
            academic_session_id,
            campus_id: campus_id || 1
        });
    }
};

module.exports = classService;