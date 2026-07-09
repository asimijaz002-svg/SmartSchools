// ============================================
// FILE: src/controllers/attendanceController.js
// PURPOSE: Request/Response handlers for attendance
// ============================================

const attendanceService = require('../services/attendanceService');
const AppError = require('../utils/appError');

const attendanceController = {
    // Mark single student attendance
    markSingle: async (req, res, next) => {
        try {
            const { student_id, class_id, attendance_date, status_id, 
                    check_in_time, check_out_time, remarks } = req.body;
            
            const campus_id = req.campusId; // From campus middleware

            const result = await attendanceService.markSingleAttendance({
                student_id,
                class_id,
                attendance_date,
                status_id,
                check_in_time,
                check_out_time,
                remarks,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Attendance marked successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Bulk mark attendance for a class
    markBulk: async (req, res, next) => {
        try {
            const { class_id, attendance_date, status_id, students, remarks } = req.body;
            const campus_id = req.campusId;

            if (!students || students.length === 0) {
                return next(new AppError('Student list is required', 400));
            }

            const result = await attendanceService.markBulkAttendance({
                class_id,
                attendance_date,
                status_id,
                students,
                remarks,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Bulk attendance marked successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get attendance for a class on a specific date
    getClassAttendance: async (req, res, next) => {
        try {
            const { class_id, attendance_date } = req.params;
            const campus_id = req.campusId;

            const result = await attendanceService.getClassAttendance({
                class_id,
                attendance_date,
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

    // Get student attendance report
    getStudentReport: async (req, res, next) => {
        try {
            const { student_id } = req.params;
            const { start_date, end_date } = req.query;
            const campus_id = req.campusId;

            if (!start_date || !end_date) {
                return next(new AppError('start_date and end_date are required', 400));
            }

            const result = await attendanceService.getStudentAttendanceReport({
                student_id,
                start_date,
                end_date,
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

    // Get monthly summary for a class
    getClassMonthlySummary: async (req, res, next) => {
        try {
            const { class_id } = req.params;
            const { month_year } = req.query;
            const campus_id = req.campusId;

            if (!month_year) {
                return next(new AppError('month_year is required (YYYY-MM-DD format)', 400));
            }

            const result = await attendanceService.getClassMonthlySummary({
                class_id,
                month_year: new Date(month_year),
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

    // Update attendance record
    updateAttendance: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { status_id, check_in_time, check_out_time, remarks } = req.body;

            const result = await attendanceService.updateAttendance(id, {
                status_id,
                check_in_time,
                check_out_time,
                remarks
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(200).json({
                success: true,
                message: 'Attendance updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = attendanceController;