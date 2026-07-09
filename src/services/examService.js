// ============================================
// FILE: src/services/examService.js
// PURPOSE: Business logic for exams
// ============================================

const examRepository = require('../repositories/examRepository');
const examMarksRepository = require('../repositories/examMarksRepository');
const studentRepository = require('../repositories/studentRepository');
const sessionRepository = require('../repositories/sessionRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const examService = {
    // Create exam
    createExam: async (examData, actor) => {
        const {
            exam_type_id, name, class_id, academic_session_id,
            subject_id, exam_date, total_marks, passing_marks,
            is_practical, campus_id
        } = examData;

        if (!exam_type_id || !name || !class_id || !academic_session_id ||
            !subject_id || !exam_date) {
            throw new AppError('Missing required fields: exam_type_id, name, class_id, academic_session_id, subject_id, exam_date', 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            const result = await examRepository.create({
                ...examData,
                campus_id: campus_id || 1,
                created_by: actor.user_id
            }, connection);

            // Add students to exam marks (initialize with null marks)
            const students = await studentRepository.findByClassAdvanced({
                class_name: class_id,
                academic_session_id: academic_session_id,
                campus_id: campus_id || 1
            });

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'EXAM_CREATE',
                entity_name: 'exams',
                entity_id: result.insertId,
                new_values: examData,
                ip_address: actor.ip_address
            });

            return { id: result.insertId, ...examData };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get exams with pagination
    getExams: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const exams = await examRepository.findAll({
            search: options.search || null,
            class_id: options.class_id || null,
            exam_type_id: options.exam_type_id || null,
            subject_id: options.subject_id || null,
            is_published: options.is_published !== undefined ? options.is_published : null,
            sortBy: options.sortBy || 'exam_date',
            sortOrder: options.sortOrder || 'DESC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = await examRepository.countAll({
            search: options.search || null,
            class_id: options.class_id || null,
            exam_type_id: options.exam_type_id || null,
            subject_id: options.subject_id || null,
            is_published: options.is_published !== undefined ? options.is_published : null,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: exams,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages
            }
        };
    },

    // Get exam by ID
    getExamById: async (id) => {
        const exam = await examRepository.findById(id);
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }
        return exam;
    },

    // Get exams by class
    getExamsByClass: async (class_id, academic_session_id) => {
        return await examRepository.findByClass(class_id, academic_session_id);
    },

    // Update exam
    updateExam: async (id, updateData, actor) => {
        const exam = await examRepository.findById(id);
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }

        if (updateData.is_published === true && exam.is_published === false) {
            updateData.published_at = new Date();
        }

        updateData.updated_by = actor.user_id;

        await examRepository.update(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'EXAM_UPDATE',
            entity_name: 'exams',
            entity_id: parseInt(id),
            previous_values: exam,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Exam updated successfully' };
    },

    // Delete exam
    deleteExam: async (id, actor) => {
        const exam = await examRepository.findById(id);
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }

        if (exam.is_published) {
            throw new AppError('Cannot delete a published exam. Unpublish first.', 400);
        }

        await examRepository.delete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'EXAM_DELETE',
            entity_name: 'exams',
            entity_id: parseInt(id),
            previous_values: exam,
            new_values: null,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Exam deleted successfully' };
    },

    // Get exam statistics
    getExamStats: async (campus_id) => {
        return await examRepository.getExamStats(campus_id || 1);
    }
};

module.exports = examService;