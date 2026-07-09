// ============================================
// FILE: src/repositories/examMarksRepository.js
// PURPOSE: Database operations for exam marks
// ============================================

const db = require('../config/db');

const examMarksRepository = {
    // Create or update marks
    upsert: async (marksData, connection = null) => {
        const client = connection || db;
        const {
            exam_id = null, student_id = null, theory_marks = null,
            practical_marks = null, total_marks = null, grade = null,
            grade_points = null, remarks = null, entered_by = null
        } = marksData;

        const query = `
            INSERT INTO exam_marks (
                exam_id, student_id, theory_marks, practical_marks,
                total_marks, grade, grade_points, remarks, entered_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                theory_marks = VALUES(theory_marks),
                practical_marks = VALUES(practical_marks),
                total_marks = VALUES(total_marks),
                grade = VALUES(grade),
                grade_points = VALUES(grade_points),
                remarks = VALUES(remarks),
                updated_by = VALUES(entered_by),
                updated_at = CURRENT_TIMESTAMP
        `;

        const [result] = await client.execute(query, [
            exam_id, student_id, theory_marks, practical_marks,
            total_marks, grade, grade_points, remarks, entered_by
        ]);
        return result;
    },

    // Get marks by exam
    findByExam: async (exam_id) => {
        const query = `
            SELECT em.*, s.roll_no, s.first_name, s.last_name, s.class_name
            FROM exam_marks em
            JOIN students s ON em.student_id = s.id
            WHERE em.exam_id = ?
            ORDER BY s.roll_no
        `;
        const [rows] = await db.execute(query, [exam_id]);
        return rows;
    },

    // Get marks by student
    findByStudent: async (student_id, academic_session_id) => {
        const query = `
            SELECT em.*, e.name as exam_name, e.exam_date, s.name as subject_name
            FROM exam_marks em
            JOIN exams e ON em.exam_id = e.id
            JOIN subjects s ON e.subject_id = s.id
            WHERE em.student_id = ? AND e.academic_session_id = ?
            ORDER BY e.exam_date DESC
        `;
        const [rows] = await db.execute(query, [student_id, academic_session_id]);
        return rows;
    },

    // Get marks by exam and student
    findByExamAndStudent: async (exam_id, student_id) => {
        const query = `
            SELECT * FROM exam_marks
            WHERE exam_id = ? AND student_id = ?
        `;
        const [rows] = await db.execute(query, [exam_id, student_id]);
        return rows[0];
    },

    // Get exam result summary
    getExamSummary: async (exam_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_students,
                ROUND(AVG(total_marks), 2) as average_marks,
                MAX(total_marks) as highest_marks,
                MIN(total_marks) as lowest_marks,
                SUM(CASE WHEN grade = 'A+' THEN 1 ELSE 0 END) as a_plus_count,
                SUM(CASE WHEN grade = 'A' THEN 1 ELSE 0 END) as a_count,
                SUM(CASE WHEN grade = 'B' THEN 1 ELSE 0 END) as b_count,
                SUM(CASE WHEN grade = 'C' THEN 1 ELSE 0 END) as c_count,
                SUM(CASE WHEN grade = 'D' THEN 1 ELSE 0 END) as d_count,
                SUM(CASE WHEN grade = 'F' THEN 1 ELSE 0 END) as f_count,
                SUM(CASE WHEN total_marks >= passing_marks THEN 1 ELSE 0 END) as passed,
                SUM(CASE WHEN total_marks < passing_marks THEN 1 ELSE 0 END) as failed
            FROM exam_marks em
            JOIN exams e ON em.exam_id = e.id
            WHERE em.exam_id = ?
        `;
        const [rows] = await db.execute(query, [exam_id]);
        return rows[0];
    },

    // Bulk insert marks
    bulkInsert: async (marksRecords, connection = null) => {
        const client = connection || db;
        if (marksRecords.length === 0) return { affectedRows: 0 };

        const placeholders = marksRecords.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = marksRecords.flatMap(m => [
            m.exam_id, m.student_id, m.theory_marks, m.practical_marks,
            m.total_marks, m.grade, m.grade_points, m.remarks, m.entered_by
        ]);

        const query = `
            INSERT INTO exam_marks (
                exam_id, student_id, theory_marks, practical_marks,
                total_marks, grade, grade_points, remarks, entered_by
            ) VALUES ${placeholders}
            ON DUPLICATE KEY UPDATE
                theory_marks = VALUES(theory_marks),
                practical_marks = VALUES(practical_marks),
                total_marks = VALUES(total_marks),
                grade = VALUES(grade),
                grade_points = VALUES(grade_points),
                remarks = VALUES(remarks),
                updated_by = VALUES(entered_by),
                updated_at = CURRENT_TIMESTAMP
        `;

        const [result] = await client.execute(query, values);
        return result;
    },

    // Verify marks
    verify: async (exam_id, verified_by, connection = null) => {
        const client = connection || db;
        const query = `
            UPDATE exam_marks 
            SET is_verified = TRUE, verified_by = ?, verified_at = CURRENT_TIMESTAMP
            WHERE exam_id = ?
        `;
        const [result] = await client.execute(query, [verified_by, exam_id]);
        return result;
    },

    // Get student rank in exam
    getStudentRank: async (exam_id, student_id) => {
        const query = `
            SELECT 
                student_id,
                RANK() OVER (ORDER BY total_marks DESC) as rank_position
            FROM exam_marks
            WHERE exam_id = ?
        `;
        const [rows] = await db.execute(query, [exam_id]);
        const rank = rows.find(r => r.student_id === student_id);
        return rank ? rank.rank_position : null;
    }
};

module.exports = examMarksRepository;