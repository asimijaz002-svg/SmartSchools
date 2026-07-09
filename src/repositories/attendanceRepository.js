// ============================================
// FILE: src/repositories/attendanceRepository.js
// PURPOSE: Database queries for attendance module
// ============================================

const db = require('../config/db');

const attendanceRepository = {
       // Create single attendance record (with transaction support) - FIXED
       create: async (attendanceData, connection = null) => {
        const client = connection || db;
        const {
            student_id = null,
            class_id = null,
            academic_session_id = null,
            attendance_date = null,
            status_id = null,
            check_in_time = null,
            check_out_time = null,
            remarks = null,
            marked_by = null,
            campus_id = 1
        } = attendanceData;

        // Validate required fields
        if (!student_id) throw new Error('student_id is required');
        if (!class_id) throw new Error('class_id is required');
        if (!academic_session_id) throw new Error('academic_session_id is required');
        if (!attendance_date) throw new Error('attendance_date is required');
        if (!status_id) throw new Error('status_id is required');
        if (!marked_by) throw new Error('marked_by is required');

        const query = `
            INSERT INTO attendance 
            (student_id, class_id, academic_session_id, attendance_date, status_id, 
             check_in_time, check_out_time, remarks, marked_by, campus_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const [result] = await client.execute(query, [
            student_id,
            class_id,
            academic_session_id,
            attendance_date,
            status_id,
            check_in_time,
            check_out_time,
            remarks,
            marked_by,
            campus_id || 1
        ]);
        return result;
    },

    // Bulk insert attendance records (for multiple students)
    bulkCreate: async (attendanceRecords, connection = null) => {
        const client = connection || db;
        if (attendanceRecords.length === 0) return { affectedRows: 0 };

        const placeholders = attendanceRecords.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = attendanceRecords.flatMap(record => [
            record.student_id, record.class_id, record.academic_session_id, 
            record.attendance_date, record.status_id, record.check_in_time || null,
            record.check_out_time || null, record.remarks || null, record.marked_by, 
            record.campus_id || 1
        ]);

        const query = `
            INSERT INTO attendance 
            (student_id, class_id, academic_session_id, attendance_date, status_id, 
             check_in_time, check_out_time, remarks, marked_by, campus_id) 
            VALUES ${placeholders}
            ON DUPLICATE KEY UPDATE 
                status_id = VALUES(status_id),
                check_in_time = VALUES(check_in_time),
                check_out_time = VALUES(check_out_time),
                remarks = VALUES(remarks),
                updated_at = CURRENT_TIMESTAMP
        `;
        const [result] = await client.execute(query, values);
        return result;
    },

    // Find attendance by date and class
    findByDateAndClass: async ({ class_id, attendance_date, academic_session_id, campus_id }) => {
        const query = `
            SELECT a.*, s.roll_no, s.first_name, s.last_name, ast.status, u.username as marked_by_name
            FROM attendance a
            JOIN students s ON a.student_id = s.id
            JOIN attendance_status ast ON a.status_id = ast.id
            JOIN users u ON a.marked_by = u.id
            WHERE a.class_id = ? 
              AND a.attendance_date = ? 
              AND a.academic_session_id = ?
              AND a.campus_id = ?
              AND s.deleted_at IS NULL
            ORDER BY s.roll_no
        `;
        const [rows] = await db.execute(query, [class_id, attendance_date, academic_session_id, campus_id || 1]);
        return rows;
    },

    // Find attendance for a specific student
    findByStudentAndDateRange: async ({ student_id, start_date, end_date, academic_session_id, campus_id }) => {
        const query = `
            SELECT a.*, ast.status
            FROM attendance a
            JOIN attendance_status ast ON a.status_id = ast.id
            WHERE a.student_id = ? 
              AND a.attendance_date BETWEEN ? AND ?
              AND a.academic_session_id = ?
              AND a.campus_id = ?
            ORDER BY a.attendance_date DESC
        `;
        const [rows] = await db.execute(query, [student_id, start_date, end_date, academic_session_id, campus_id || 1]);
        return rows;
    },

    // Find a single attendance record by ID
    findById: async (id, connection = null) => {
        const client = connection || db;
        const query = `SELECT * FROM attendance WHERE id = ?`;
        const [rows] = await client.execute(query, [id]);
        return rows[0];
    },

    // Get monthly attendance summary
    getMonthlySummary: async ({ student_id, month_year, academic_session_id, campus_id }) => {
        const query = `
            SELECT * FROM attendance_summary
            WHERE student_id = ? 
              AND month_year = ? 
              AND academic_session_id = ?
              AND campus_id = ?
        `;
        const [rows] = await db.execute(query, [student_id, month_year, academic_session_id, campus_id || 1]);
        return rows[0];
    },

    // Calculate and update monthly summary
    calculateMonthlySummary: async ({ student_id, class_id, academic_session_id, month_year, campus_id }, connection = null) => {
        const client = connection || db;
        
        // Get first and last day of month
        const year = month_year.getFullYear();
        const month = month_year.getMonth();
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        const formattedStartDate = startDate.toISOString().split('T')[0];
        const formattedEndDate = endDate.toISOString().split('T')[0];

        // Calculate attendance stats
        const statsQuery = `
            SELECT 
                COUNT(*) as total_days,
                SUM(CASE WHEN ast.status = 'Present' THEN 1 ELSE 0 END) as present_days,
                SUM(CASE WHEN ast.status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
                SUM(CASE WHEN ast.status = 'Late' THEN 1 ELSE 0 END) as late_days,
                SUM(CASE WHEN ast.status = 'Leave' THEN 1 ELSE 0 END) as leave_days
            FROM attendance a
            JOIN attendance_status ast ON a.status_id = ast.id
            WHERE a.student_id = ? 
              AND a.attendance_date BETWEEN ? AND ?
              AND a.academic_session_id = ?
              AND a.campus_id = ?
        `;
        const [stats] = await client.execute(statsQuery, [
            student_id, formattedStartDate, formattedEndDate, academic_session_id, campus_id || 1
        ]);

        const totalDays = stats[0]?.total_days || 0;
        const presentDays = stats[0]?.present_days || 0;
        const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

        // UPSERT summary
        const upsertQuery = `
            INSERT INTO attendance_summary 
            (student_id, class_id, academic_session_id, month_year, present_days, absent_days, 
             late_days, leave_days, total_days, attendance_percentage, campus_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                present_days = VALUES(present_days),
                absent_days = VALUES(absent_days),
                late_days = VALUES(late_days),
                leave_days = VALUES(leave_days),
                total_days = VALUES(total_days),
                attendance_percentage = VALUES(attendance_percentage),
                updated_at = CURRENT_TIMESTAMP
        `;
        
        await client.execute(upsertQuery, [
            student_id, class_id, academic_session_id, month_year,
            presentDays, stats[0]?.absent_days || 0, stats[0]?.late_days || 0,
            stats[0]?.leave_days || 0, totalDays, attendancePercentage, campus_id || 1
        ]);

        return {
            total_days: totalDays,
            present_days: presentDays,
            absent_days: stats[0]?.absent_days || 0,
            late_days: stats[0]?.late_days || 0,
            leave_days: stats[0]?.leave_days || 0,
            attendance_percentage: attendancePercentage
        };
    },

    // Check if attendance exists for date
    existsForDate: async ({ student_id, attendance_date, academic_session_id, campus_id }) => {
        const query = `
            SELECT id FROM attendance 
            WHERE student_id = ? 
              AND attendance_date = ? 
              AND academic_session_id = ?
              AND campus_id = ?
        `;
        const [rows] = await db.execute(query, [student_id, attendance_date, academic_session_id, campus_id || 1]);
        return rows.length > 0;
    },

    // Update attendance record
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const { status_id, check_in_time, check_out_time, remarks } = updateData;
        
        const query = `
            UPDATE attendance 
            SET status_id = ?, check_in_time = ?, check_out_time = ?, remarks = ?
            WHERE id = ?
        `;
        const [result] = await client.execute(query, [status_id, check_in_time, check_out_time, remarks, id]);
        return result;
    },

    // Delete attendance (for correction)
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `DELETE FROM attendance WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    }
};

module.exports = attendanceRepository;