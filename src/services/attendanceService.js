// ============================================
// FILE: src/services/attendanceService.js
// PURPOSE: Business logic for attendance module
// ============================================

const attendanceRepository = require('../repositories/attendanceRepository');
const studentRepository = require('../repositories/studentRepository');
const sessionRepository = require('../repositories/sessionRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const eventEmitter = require('../utils/eventEmitter');
const AppError = require('../utils/appError');

const attendanceService = {
    // Mark attendance for a single student - FIXED
    markSingleAttendance: async (attendanceData, actor) => {
        const { 
            student_id, 
            class_id, 
            attendance_date, 
            status_id, 
            check_in_time, 
            check_out_time, 
            remarks, 
            campus_id 
        } = attendanceData;

        // Validate required fields
        if (!student_id) throw new AppError('Student ID is required', 400);
        if (!class_id) throw new AppError('Class ID is required', 400);
        if (!attendance_date) throw new AppError('Attendance date is required', 400);
        if (!status_id) throw new AppError('Status ID is required', 400);

        // Validate student exists
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        // Get active session
        const activeSession = await sessionRepository.getActiveSession();
        if (!activeSession) {
            throw new AppError('No active academic session found', 500);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Check if attendance already exists
            const exists = await attendanceRepository.existsForDate({
                student_id: parseInt(student_id),
                attendance_date,
                academic_session_id: activeSession.id,
                campus_id: campus_id || 1
            });

            if (exists) {
                throw new AppError('Attendance already marked for this date', 400);
            }

            // Create attendance record with all required fields
            const result = await attendanceRepository.create({
                student_id: parseInt(student_id),
                class_id: parseInt(class_id),
                academic_session_id: activeSession.id,
                attendance_date: attendance_date,
                status_id: parseInt(status_id),
                check_in_time: check_in_time || null,
                check_out_time: check_out_time || null,
                remarks: remarks || null,
                marked_by: actor.user_id,
                campus_id: campus_id || 1
            }, connection);

            // Recalculate monthly summary
            const monthYear = new Date(attendance_date);
            monthYear.setDate(1);

            await attendanceRepository.calculateMonthlySummary({
                student_id: parseInt(student_id),
                class_id: parseInt(class_id),
                academic_session_id: activeSession.id,
                month_year: monthYear,
                campus_id: campus_id || 1
            }, connection);

            await connection.commit();

            // Audit log
            await auditService.log({
                user_id: actor.user_id,
                action: 'ATTENDANCE_MARK',
                entity_name: 'attendance',
                entity_id: result.insertId,
                previous_values: null,
                new_values: { student_id, attendance_date, status_id },
                ip_address: actor.ip_address
            });

            // Emit event for notifications
            eventEmitter.emit('attendance.marked', {
                student_id,
                attendance_date,
                status_id,
                student_name: `${student.first_name} ${student.last_name}`
            });

            return { id: result.insertId, message: 'Attendance marked successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Bulk mark attendance for a class
    markBulkAttendance: async (bulkData, actor) => {
        const { class_id, attendance_date, status_id, students, remarks, campus_id } = bulkData;

        if (!students || students.length === 0) {
            throw new AppError('No students provided for attendance marking', 400);
        }

        // Get active session
        const activeSession = await sessionRepository.getActiveSession();
        if (!activeSession) {
            throw new AppError('No active academic session found', 500);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Prepare bulk data
            const attendanceRecords = students.map(studentId => ({
                student_id: parseInt(studentId),
                class_id: parseInt(class_id),
                academic_session_id: activeSession.id,
                attendance_date: attendance_date,
                status_id: parseInt(status_id),
                marked_by: actor.user_id,
                campus_id: campus_id || 1,
                remarks: remarks || null,
                check_in_time: null,
                check_out_time: null
            }));

            const result = await attendanceRepository.bulkCreate(attendanceRecords, connection);

            // Recalculate monthly summaries for affected students
            const monthYear = new Date(attendance_date);
            monthYear.setDate(1);

            for (const studentId of students) {
                await attendanceRepository.calculateMonthlySummary({
                    student_id: parseInt(studentId),
                    class_id: parseInt(class_id),
                    academic_session_id: activeSession.id,
                    month_year: monthYear,
                    campus_id: campus_id || 1
                }, connection);
            }

            await connection.commit();

            // Audit log
            await auditService.log({
                user_id: actor.user_id,
                action: 'ATTENDANCE_BULK_MARK',
                entity_name: 'attendance',
                entity_id: null,
                previous_values: null,
                new_values: { class_id, attendance_date, student_count: students.length, status_id },
                ip_address: actor.ip_address
            });

            // Emit event for notifications
            eventEmitter.emit('attendance.bulk.marked', {
                class_id,
                attendance_date,
                student_count: students.length,
                status_id
            });

            return {
                affected_rows: result.affectedRows,
                message: `Attendance marked successfully for ${students.length} students`
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get attendance for a class on a specific date
    getClassAttendance: async ({ class_id, attendance_date, campus_id }) => {
        const activeSession = await sessionRepository.getActiveSession();
        if (!activeSession) {
            throw new AppError('No active academic session found', 500);
        }

        const attendance = await attendanceRepository.findByDateAndClass({
            class_id: parseInt(class_id),
            attendance_date,
            academic_session_id: activeSession.id,
            campus_id: campus_id || 1
        });

        // Get all students in class
        const allStudents = await studentRepository.findByClass(class_id, activeSession.id);
        const presentStudentIds = attendance.map(a => a.student_id);

        const absentStudents = allStudents
            .filter(s => !presentStudentIds.includes(s.id))
            .map(s => ({
                student_id: s.id,
                roll_no: s.roll_no,
                first_name: s.first_name,
                last_name: s.last_name,
                status: 'Not Marked'
            }));

        return {
            attendance_date,
            class_id,
            present: attendance,
            absent: absentStudents,
            total_students: allStudents.length,
            marked_count: attendance.length,
            absent_count: absentStudents.length
        };
    },

    // Get attendance report for a student
    getStudentAttendanceReport: async ({ student_id, start_date, end_date, campus_id }) => {
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        const activeSession = await sessionRepository.getActiveSession();
        if (!activeSession) {
            throw new AppError('No active academic session found', 500);
        }

        const attendance = await attendanceRepository.findByStudentAndDateRange({
            student_id: parseInt(student_id),
            start_date,
            end_date,
            academic_session_id: activeSession.id,
            campus_id: campus_id || 1
        });

        // Calculate statistics
        const totalDays = attendance.length;
        const presentDays = attendance.filter(a => a.status === 'Present').length;
        const absentDays = attendance.filter(a => a.status === 'Absent').length;
        const lateDays = attendance.filter(a => a.status === 'Late').length;
        const leaveDays = attendance.filter(a => a.status === 'Leave').length;
        const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        return {
            student: {
                id: student.id,
                roll_no: student.roll_no,
                name: `${student.first_name} ${student.last_name}`,
                class_name: student.class_name
            },
            period: { start_date, end_date },
            summary: {
                total_days: totalDays,
                present: presentDays,
                absent: absentDays,
                late: lateDays,
                leave: leaveDays,
                attendance_percentage: attendancePercentage
            },
            daily_records: attendance
        };
    },

    // Get monthly attendance summary for a class
    getClassMonthlySummary: async ({ class_id, month_year, campus_id }) => {
        const activeSession = await sessionRepository.getActiveSession();
        if (!activeSession) {
            throw new AppError('No active academic session found', 500);
        }

        const students = await studentRepository.findByClass(class_id, activeSession.id);

        const summaries = [];
        for (const student of students) {
            const summary = await attendanceRepository.getMonthlySummary({
                student_id: student.id,
                month_year,
                academic_session_id: activeSession.id,
                campus_id: campus_id || 1
            });

            if (summary) {
                summaries.push({
                    student_id: student.id,
                    roll_no: student.roll_no,
                    name: `${student.first_name} ${student.last_name}`,
                    ...summary
                });
            }
        }

        return {
            class_id,
            month_year,
            total_students: summaries.length,
            summaries
        };
    },

    // Update attendance record (for correction)
    updateAttendance: async (attendanceId, updateData, actor) => {
        const { status_id, check_in_time, check_out_time, remarks } = updateData;

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            // Get existing record
            const existingRecord = await attendanceRepository.findById(attendanceId, connection);
            if (!existingRecord) {
                throw new AppError('Attendance record not found', 404);
            }

            // Update record
            await attendanceRepository.update(attendanceId, {
                status_id: parseInt(status_id),
                check_in_time: check_in_time || null,
                check_out_time: check_out_time || null,
                remarks: remarks || null
            }, connection);

            // Recalculate monthly summary
            const monthYear = new Date(existingRecord.attendance_date);
            monthYear.setDate(1);

            await attendanceRepository.calculateMonthlySummary({
                student_id: existingRecord.student_id,
                class_id: existingRecord.class_id,
                academic_session_id: existingRecord.academic_session_id,
                month_year: monthYear,
                campus_id: existingRecord.campus_id
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'ATTENDANCE_UPDATE',
                entity_name: 'attendance',
                entity_id: parseInt(attendanceId),
                previous_values: existingRecord,
                new_values: updateData,
                ip_address: actor.ip_address
            });

            return { id: parseInt(attendanceId), message: 'Attendance updated successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = attendanceService;