// ============================================
// FILE: src/services/studentService.js
// PURPOSE: Enhanced business logic for student management
// ============================================

const eventEmitter = require('../utils/eventEmitter');
const fs = require('fs');
const path = require('path');
const studentRepository = require('../repositories/studentRepository');
const sessionRepository = require('../repositories/sessionRepository');
const invoiceRepository = require('../repositories/invoiceRepository');
const guardianRepository = require('../repositories/guardianRepository'); // 👈 NEW
const studentHistoryService = require('./studentHistoryService'); // 👈 NEW
const dbPool = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const studentService = {
    // ============================================
    // EXISTING METHODS
    // ============================================

    // UPDATED: Now runs atomically as a Transaction
    registerStudent: async (studentData, actor) => {
        const activeSession = await sessionRepository.getActiveSession();
        if (!activeSession) {
            throw new AppError('No active academic session found. Please contact the administrator.', 500);
        }

        const existingStudent = await studentRepository.findByRollNo(studentData.roll_no);
        if (existingStudent) {
            throw new AppError('Roll number already exists', 400);
        }

        studentData.academic_session_id = activeSession.id;

        const connection = await dbPool.getConnection();

        try {
            await connection.beginTransaction();

            const studentResult = await studentRepository.create(studentData, connection);
            const studentId = studentResult.insertId;

            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 15);

            const invoiceData = {
                student_id: studentId,
                amount: 5000.00,
                due_date: dueDate.toISOString().slice(0, 10)
            };

            await invoiceRepository.create(invoiceData, connection);

            await connection.commit();

            eventEmitter.emit('student.admitted', {
                id: studentId,
                ...studentData
            });

            await auditService.log({
                user_id: actor.user_id,
                action: 'STUDENT_ADMISSION',
                entity_name: 'students',
                entity_id: studentId,
                previous_values: null,
                new_values: { ...studentData, admission_fee_invoice: invoiceData },
                ip_address: actor.ip_address
            });

            // Add to student history
            await studentHistoryService.addHistoryEvent({
                student_id: studentId,
                event_type: 'ADMISSION',
                event_date: new Date(),
                description: `Student admitted with roll number ${studentData.roll_no}`,
                new_values: studentData,
                created_by: actor.user_id
            });

            return { id: studentId, ...studentData };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    getStudents: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const allowedSortFields = ['first_name', 'last_name', 'roll_no', 'created_at'];
        const sortBy = allowedSortFields.includes(options.sortBy) ? options.sortBy : 'created_at';
        const sortOrder = (options.sortOrder && options.sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';

        const search = options.search || null;
        const class_name = options.class_name || null;

        const activeSession = await sessionRepository.getActiveSession();
        const academic_session_id = options.academic_session_id
            ? parseInt(options.academic_session_id)
            : (activeSession ? activeSession.id : null);

        const students = await studentRepository.findAll({ search, class_name, academic_session_id, sortBy, sortOrder, limit, offset });
        const totalRecords = await studentRepository.countAll({ search, class_name, academic_session_id });
        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: students,
            pagination: { page, limit, total_records: totalRecords, total_pages: totalPages, academic_session_id }
        };
    },

    getStudentById: async (id) => {
        const student = await studentRepository.findById(id);
        if (!student) {
            throw new AppError('Student not found or has been deactivated', 404);
        }
        return student;
    },

    updateStudent: async (id, updateData, actor) => {
        const student = await studentRepository.findById(id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        if (updateData.roll_no && updateData.roll_no !== student.roll_no) {
            const existing = await studentRepository.findByRollNo(updateData.roll_no);
            if (existing) {
                throw new AppError('This new roll number is already assigned to another student', 400);
            }
        }

        const finalData = {
            roll_no: updateData.roll_no || student.roll_no,
            first_name: updateData.first_name || student.first_name,
            last_name: updateData.last_name || student.last_name,
            email: updateData.email !== undefined ? updateData.email : student.email,
            class_name: updateData.class_name || student.class_name
        };

        await studentRepository.update(id, finalData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'STUDENT_UPDATE',
            entity_name: 'students',
            entity_id: parseInt(id),
            previous_values: student,
            new_values: finalData,
            ip_address: actor.ip_address
        });

        // Add to student history
        await studentHistoryService.addHistoryEvent({
            student_id: id,
            event_type: 'CLASS_CHANGE',
            event_date: new Date(),
            description: 'Student information updated',
            previous_values: student,
            new_values: finalData,
            created_by: actor.user_id
        });

        return { id: parseInt(id), ...finalData };
    },

    deleteStudent: async (id, actor) => {
        const student = await studentRepository.findById(id);
        if (!student) {
            throw new AppError('Student not found or already deactivated', 404);
        }
        await studentRepository.softDelete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'STUDENT_DEACTIVATE',
            entity_name: 'students',
            entity_id: parseInt(id),
            previous_values: student,
            new_values: { deleted_at: 'CURRENT_TIMESTAMP' },
            ip_address: actor.ip_address
        });

        return { id: parseInt(id) };
    },

    updateStudentProfilePicture: async (id, fileName, actor) => {
        const student = await studentRepository.findById(id);

        if (!student) {
            const tempFilePath = path.join(__dirname, '../../uploads', fileName);
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            throw new AppError('Student not found or has been deactivated', 404);
        }

        if (student.profile_picture) {
            const oldFilePath = path.join(__dirname, '../../uploads', student.profile_picture);
            if (fs.existsSync(oldFilePath)) {
                try {
                    fs.unlinkSync(oldFilePath);
                } catch (err) {
                    console.warn('⚠️ Failed to clean up old profile picture file:', err.message);
                }
            }
        }

        await studentRepository.updateProfilePicture(id, fileName);

        await auditService.log({
            user_id: actor.user_id,
            action: 'STUDENT_PICTURE_UPLOAD',
            entity_name: 'students',
            entity_id: parseInt(id),
            previous_values: { profile_picture: student.profile_picture },
            new_values: { profile_picture: fileName },
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), profile_picture: fileName };
    },

    // ============================================
    // NEW ENHANCED METHODS - PHASE 5
    // ============================================

    // Get student with full details (including guardians and documents)
    getFullStudentDetails: async (id) => {
        const student = await studentRepository.getFullStudentDetails(id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        const guardians = await studentRepository.getGuardians(id);
        const documents = await studentRepository.getDocuments(id);
        const history = await studentRepository.getHistory(id);

        return {
            ...student,
            guardians,
            documents,
            history
        };
    },

    // Add guardian to student
    addGuardian: async (student_id, guardianData, actor) => {
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            const result = await guardianRepository.create({
                ...guardianData,
                student_id
            }, connection);

            // Add to history
            await studentHistoryService.addHistoryEvent({
                student_id,
                event_type: 'GUARDIAN_CHANGE',
                event_date: new Date(),
                description: `Guardian ${guardianData.full_name} added`,
                new_values: guardianData,
                created_by: actor.user_id
            });

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'GUARDIAN_ADD',
                entity_name: 'student_guardians',
                entity_id: result.insertId,
                new_values: guardianData,
                ip_address: actor.ip_address
            });

            return { id: result.insertId };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Update student status (Transfer, Withdraw, Alumni)
    updateStudentStatus: async (id, status, remarks, actor) => {
        const student = await studentRepository.findById(id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        const validStatuses = ['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'ALUMNI', 'WITHDRAWN'];
        if (!validStatuses.includes(status)) {
            throw new AppError('Invalid status. Must be one of: ' + validStatuses.join(', '), 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await studentRepository.updateStatus(id, status, connection);

            await studentHistoryService.addHistoryEvent({
                student_id: id,
                event_type: status === 'ALUMNI' ? 'ALUMNI' :
                    status === 'TRANSFERRED' ? 'TRANSFER' :
                    status === 'WITHDRAWN' ? 'WITHDRAWAL' : 'CLASS_CHANGE',
                event_date: new Date(),
                description: `Student status changed from ${student.status} to ${status}. ${remarks || ''}`,
                previous_values: { status: student.status },
                new_values: { status, remarks },
                created_by: actor.user_id
            });

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'STUDENT_STATUS_UPDATE',
                entity_name: 'students',
                entity_id: parseInt(id),
                previous_values: { status: student.status },
                new_values: { status, remarks },
                ip_address: actor.ip_address
            });

            return { id: parseInt(id), status, message: `Student status updated to ${status}` };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Bulk import students
    bulkImportStudents: async (studentRecords, actor) => {
        if (!studentRecords || studentRecords.length === 0) {
            throw new AppError('No student records provided for import', 400);
        }

        const activeSession = await sessionRepository.getActiveSession();
        if (!activeSession) {
            throw new AppError('No active academic session found', 500);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Validate and prepare each record
            const preparedRecords = [];
            for (const record of studentRecords) {
                if (!record.first_name || !record.last_name || !record.class_name) {
                    throw new AppError(`Missing required fields for student: ${record.first_name || 'Unknown'}`, 400);
                }

                // Generate roll number if not provided
                if (!record.roll_no) {
                    const count = await studentRepository.countAll({ campus_id: 1 });
                    record.roll_no = `2026-${String(count + 1).padStart(4, '0')}`;
                }

                // Generate admission number if not provided
                if (!record.admission_number) {
                    record.admission_number = `ADM-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                }

                record.academic_session_id = activeSession.id;
                record.campus_id = 1;
                preparedRecords.push(record);
            }

            const result = await studentRepository.bulkCreate(preparedRecords, connection);

            // Add to history for each student
            for (const record of preparedRecords) {
                // In production, you'd want to retrieve the inserted IDs properly
                // This is a simplified version
            }

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'STUDENT_BULK_IMPORT',
                entity_name: 'students',
                entity_id: null,
                new_values: { count: preparedRecords.length },
                ip_address: actor.ip_address
            });

            return {
                imported_count: preparedRecords.length,
                message: `${preparedRecords.length} students imported successfully`
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get student statistics
    getStudentStatistics: async (campus_id) => {
        return await studentRepository.getStudentStats(campus_id || 1);
    }
};

module.exports = studentService;