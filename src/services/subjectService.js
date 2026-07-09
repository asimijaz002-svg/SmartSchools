// ============================================
// FILE: src/services/subjectService.js
// PURPOSE: Business logic for subjects
// ============================================

const subjectRepository = require('../repositories/subjectRepository');
const sessionRepository = require('../repositories/sessionRepository');
const classRepository = require('../repositories/classRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const subjectService = {
    // Create new subject
    createSubject: async (subjectData, actor) => {
        const { 
            code, name, subject_group, subject_category, education_level,
            academic_session_id, campus_id, curriculum, total_marks,
            theory_marks, practical_marks, is_lab_required, is_compulsory
        } = subjectData;

        // Validate required fields
        if (!code || !name || !subject_group || !subject_category || 
            !education_level || !academic_session_id) {
            throw new AppError('Missing required fields. Please provide code, name, subject_group, subject_category, education_level, and academic_session_id', 400);
        }

        // Validate academic session exists
        const session = await sessionRepository.findById(academic_session_id);
        if (!session) {
            throw new AppError('Invalid academic session. Please select a valid session.', 400);
        }

        // Validate subject group
        const validGroups = ['SCIENCE', 'HUMANITIES', 'COMMERCE', 'ARTS', 'GENERAL', 'RELIGIOUS'];
        if (!validGroups.includes(subject_group)) {
            throw new AppError(`Invalid subject group. Must be one of: ${validGroups.join(', ')}`, 400);
        }

        // Validate subject category
        const validCategories = ['CORE', 'ELECTIVE', 'COMPULSORY', 'OPTIONAL', 'EXTRA_CURRICULAR'];
        if (!validCategories.includes(subject_category)) {
            throw new AppError(`Invalid subject category. Must be one of: ${validCategories.join(', ')}`, 400);
        }

        // Validate education level
        const validLevels = ['PRIMARY', 'MIDDLE', 'SECONDARY', 'HIGHER_SECONDARY', 'O_LEVEL', 'A_LEVEL', 'MATRIC', 'INTERMEDIATE'];
        if (!validLevels.includes(education_level)) {
            throw new AppError(`Invalid education level. Must be one of: ${validLevels.join(', ')}`, 400);
        }

        // Check duplicate code
        const existing = await subjectRepository.findByCode(code, academic_session_id, campus_id);
        if (existing) {
            throw new AppError('Subject with this code already exists in the selected session.', 400);
        }

        // Check duplicate name
        const existingName = await subjectRepository.findByName(name, academic_session_id, campus_id);
        if (existingName) {
            throw new AppError('Subject with this name already exists in the selected session.', 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            const result = await subjectRepository.create({
                code,
                name,
                full_name: subjectData.full_name || null,
                description: subjectData.description || null,
                subject_group,
                subject_category,
                education_level,
                curriculum: curriculum || 'PUNJAB',
                credits: subjectData.credits || 0,
                total_marks: total_marks || 100,
                theory_marks: theory_marks || 0,
                practical_marks: practical_marks || 0,
                passing_marks: subjectData.passing_marks || 33,
                is_lab_required: is_lab_required || false,
                is_compulsory: is_compulsory || false,
                academic_session_id,
                campus_id: campus_id || 1,
                created_by: actor.user_id
            }, connection);

            // If class_ids provided, link subject to classes
            if (subjectData.class_ids && subjectData.class_ids.length > 0) {
                for (const classId of subjectData.class_ids) {
                    const classExists = await classRepository.findById(classId);
                    if (classExists) {
                        await subjectRepository.linkToClass({
                            subject_id: result.insertId,
                            class_id: classId,
                            is_core: subjectData.is_core || true,
                            total_periods_per_week: subjectData.total_periods || 5,
                            is_mandatory: subjectData.is_mandatory || true
                        }, connection);
                    }
                }
            }

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'SUBJECT_CREATE',
                entity_name: 'subjects',
                entity_id: result.insertId,
                previous_values: null,
                new_values: subjectData,
                ip_address: actor.ip_address
            });

            return { id: result.insertId, ...subjectData };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get all subjects with pagination and filters
    getSubjects: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        // If no session provided, try to get active session
        let academicSessionId = options.academic_session_id;
        if (!academicSessionId) {
            const activeSession = await sessionRepository.getActiveSession(options.campus_id || 1);
            academicSessionId = activeSession ? activeSession.id : null;
        }

        const subjects = await subjectRepository.findAll({
            search: options.search || null,
            subject_group: options.subject_group || null,
            subject_category: options.subject_category || null,
            education_level: options.education_level || null,
            curriculum: options.curriculum || null,
            is_compulsory: options.is_compulsory !== undefined ? options.is_compulsory : null,
            academic_session_id: academicSessionId,
            sortBy: options.sortBy || 'name',
            sortOrder: options.sortOrder || 'ASC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = await subjectRepository.countAll({
            search: options.search || null,
            subject_group: options.subject_group || null,
            subject_category: options.subject_category || null,
            education_level: options.education_level || null,
            curriculum: options.curriculum || null,
            is_compulsory: options.is_compulsory !== undefined ? options.is_compulsory : null,
            academic_session_id: academicSessionId,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: subjects,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages,
                academic_session_id: academicSessionId
            }
        };
    },

    // Get subject by ID
    getSubjectById: async (id) => {
        const subject = await subjectRepository.findById(id);
        if (!subject) {
            throw new AppError('Subject not found or inactive', 404);
        }

        // Get class links
        const classLinks = await subjectRepository.getClassLinks(id);
        subject.class_links = classLinks;

        return subject;
    },

    // Update subject
    updateSubject: async (id, updateData, actor) => {
        const subject = await subjectRepository.findById(id);
        if (!subject) {
            throw new AppError('Subject not found', 404);
        }

        // Validate academic session exists (if provided)
        if (updateData.academic_session_id) {
            const session = await sessionRepository.findById(updateData.academic_session_id);
            if (!session) {
                throw new AppError('Invalid academic session.', 400);
            }
        }

        // Check duplicate code
        if (updateData.code && updateData.code !== subject.code) {
            const existing = await subjectRepository.findByCode(
                updateData.code, 
                updateData.academic_session_id || subject.academic_session_id,
                subject.campus_id
            );
            if (existing && existing.id !== parseInt(id)) {
                throw new AppError('Subject with this code already exists.', 400);
            }
        }

        // Check duplicate name
        if (updateData.name && updateData.name !== subject.name) {
            const existing = await subjectRepository.findByName(
                updateData.name,
                updateData.academic_session_id || subject.academic_session_id,
                subject.campus_id
            );
            if (existing && existing.id !== parseInt(id)) {
                throw new AppError('Subject with this name already exists.', 400);
            }
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await subjectRepository.update(id, {
                code: updateData.code || subject.code,
                name: updateData.name || subject.name,
                full_name: updateData.full_name !== undefined ? updateData.full_name : subject.full_name,
                description: updateData.description !== undefined ? updateData.description : subject.description,
                subject_group: updateData.subject_group || subject.subject_group,
                subject_category: updateData.subject_category || subject.subject_category,
                education_level: updateData.education_level || subject.education_level,
                curriculum: updateData.curriculum || subject.curriculum,
                credits: updateData.credits !== undefined ? updateData.credits : subject.credits,
                total_marks: updateData.total_marks || subject.total_marks,
                theory_marks: updateData.theory_marks || subject.theory_marks,
                practical_marks: updateData.practical_marks || subject.practical_marks,
                passing_marks: updateData.passing_marks || subject.passing_marks,
                is_lab_required: updateData.is_lab_required !== undefined ? updateData.is_lab_required : subject.is_lab_required,
                is_compulsory: updateData.is_compulsory !== undefined ? updateData.is_compulsory : subject.is_compulsory,
                is_active: updateData.is_active !== undefined ? updateData.is_active : subject.is_active,
                updated_by: actor.user_id
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'SUBJECT_UPDATE',
                entity_name: 'subjects',
                entity_id: parseInt(id),
                previous_values: subject,
                new_values: updateData,
                ip_address: actor.ip_address
            });

            return { id: parseInt(id), message: 'Subject updated successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Delete subject
    deleteSubject: async (id, actor) => {
        const subject = await subjectRepository.findById(id);
        if (!subject) {
            throw new AppError('Subject not found or already inactive', 404);
        }

        // Check if subject has exam records
        const hasExams = await subjectRepository.hasExamRecords(id);
        if (hasExams) {
            throw new AppError('Cannot delete subject with exam records.', 400);
        }

        await subjectRepository.delete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'SUBJECT_DELETE',
            entity_name: 'subjects',
            entity_id: parseInt(id),
            previous_values: subject,
            new_values: null,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Subject deactivated successfully' };
    },

    // Get subjects by education level
    getSubjectsByLevel: async ({ education_level, academic_session_id, campus_id }) => {
        if (!education_level) {
            throw new AppError('Education level is required.', 400);
        }

        const session = await sessionRepository.getActiveSession(campus_id || 1);
        const sessionId = academic_session_id || (session ? session.id : null);

        if (!sessionId) {
            throw new AppError('No active academic session found.', 404);
        }

        return await subjectRepository.findByLevel(education_level, sessionId, campus_id || 1);
    },

    // Get subjects by class
    getSubjectsByClass: async ({ class_id, academic_session_id, campus_id }) => {
        if (!class_id) {
            throw new AppError('Class ID is required.', 400);
        }

        const session = await sessionRepository.getActiveSession(campus_id || 1);
        const sessionId = academic_session_id || (session ? session.id : null);

        if (!sessionId) {
            throw new AppError('No active academic session found.', 404);
        }

        return await subjectRepository.findByClass(class_id, sessionId);
    },

    // Link subject to class
    linkSubjectToClass: async (linkData, actor) => {
        const { subject_id, class_id, is_core, total_periods_per_week, is_mandatory } = linkData;

        // Validate subject exists
        const subject = await subjectRepository.findById(subject_id);
        if (!subject) {
            throw new AppError('Subject not found.', 404);
        }

        // Validate class exists with error handling for missing columns
        try {
            const classExists = await classRepository.findById(class_id);
            if (!classExists) {
                throw new AppError('Class not found.', 404);
            }
        } catch (error) {
            // Fallback for when the users table is missing columns
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                const [rows] = await dbPool.execute('SELECT id FROM classes WHERE id = ?', [class_id]);
                if (rows.length === 0) {
                    throw new AppError('Class not found.', 404);
                }
            } else {
                throw error;
            }
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await subjectRepository.linkToClass({
                subject_id,
                class_id,
                is_core: is_core !== undefined ? is_core : true,
                total_periods_per_week: total_periods_per_week || 5,
                is_mandatory: is_mandatory !== undefined ? is_mandatory : true
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'SUBJECT_LINK_CLASS',
                entity_name: 'subject_class_levels',
                entity_id: null,
                previous_values: null,
                new_values: linkData,
                ip_address: actor.ip_address
            });

            return { message: 'Subject linked to class successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Unlink subject from class
    unlinkSubjectFromClass: async ({ subject_id, class_id }, actor) => {
        await subjectRepository.unlinkFromClass(subject_id, class_id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'SUBJECT_UNLINK_CLASS',
            entity_name: 'subject_class_levels',
            entity_id: null,
            previous_values: { subject_id, class_id },
            new_values: null,
            ip_address: actor.ip_address
        });

        return { message: 'Subject unlinked from class successfully' };
    },

    // Get subject groups
    getSubjectGroups: async () => {
        return await subjectRepository.getSubjectGroups();
    },

    // Get education levels
    getEducationLevels: async (campus_id) => {
        return await subjectRepository.getEducationLevels(campus_id || 1);
    },

    // Get subject statistics
    getSubjectStats: async (campus_id) => {
        return await subjectRepository.getSubjectStats(campus_id || 1);
    }
};

module.exports = subjectService;