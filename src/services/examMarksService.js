// ============================================
// FILE: src/services/examMarksService.js
// PURPOSE: Business logic for exam marks
// ============================================

const examMarksRepository = require('../repositories/examMarksRepository');
const examRepository = require('../repositories/examRepository');
const studentRepository = require('../repositories/studentRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

// Grade calculation helper
const calculateGrade = (percentage, gradingSystem) => {
    if (!gradingSystem || gradingSystem.length === 0) {
        // Default grading if none exists
        if (percentage >= 90) return { grade: 'A+', grade_points: 4.0 };
        if (percentage >= 85) return { grade: 'A', grade_points: 3.75 };
        if (percentage >= 80) return { grade: 'A-', grade_points: 3.5 };
        if (percentage >= 75) return { grade: 'B+', grade_points: 3.25 };
        if (percentage >= 70) return { grade: 'B', grade_points: 3.0 };
        if (percentage >= 65) return { grade: 'B-', grade_points: 2.75 };
        if (percentage >= 60) return { grade: 'C+', grade_points: 2.5 };
        if (percentage >= 50) return { grade: 'C', grade_points: 2.0 };
        if (percentage >= 40) return { grade: 'D', grade_points: 1.0 };
        return { grade: 'F', grade_points: 0.0 };
    }

    for (const grade of gradingSystem) {
        if (percentage >= grade.min_percentage && percentage <= grade.max_percentage) {
            return { grade: grade.grade, grade_points: grade.grade_points };
        }
    }
    return { grade: 'F', grade_points: 0.0 };
};

const examMarksService = {
    // Enter or update marks for a single student
    enterMarks: async (exam_id, marksData, actor) => {
        const { student_id, theory_marks, practical_marks, remarks } = marksData;

        if (!student_id) {
            throw new AppError('Student ID is required', 400);
        }

        // Get exam details
        const exam = await examRepository.findById(exam_id);
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }

        // Validate student exists
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        // Calculate total marks
        let totalMarks = 0;
        if (exam.is_practical) {
            const theory = parseFloat(theory_marks) || 0;
            const practical = parseFloat(practical_marks) || 0;
            totalMarks = theory + practical;
        } else {
            totalMarks = parseFloat(theory_marks) || 0;
        }

        // Validate marks don't exceed total
        if (totalMarks > exam.total_marks) {
            throw new AppError(`Total marks (${totalMarks}) cannot exceed exam total (${exam.total_marks})`, 400);
        }

        // Calculate percentage and grade
        const percentage = (totalMarks / exam.total_marks) * 100;

        // Get grading system
        const [gradingRows] = await dbPool.execute(
            'SELECT * FROM grading_system WHERE campus_id = ? AND is_active = TRUE',
            [exam.campus_id || 1]
        );
        const { grade, grade_points } = calculateGrade(percentage, gradingRows);

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            const result = await examMarksRepository.upsert({
                exam_id: parseInt(exam_id),
                student_id: parseInt(student_id),
                theory_marks: theory_marks !== undefined ? parseFloat(theory_marks) : null,
                practical_marks: practical_marks !== undefined ? parseFloat(practical_marks) : null,
                total_marks: parseFloat(totalMarks.toFixed(2)),
                grade,
                grade_points,
                remarks: remarks || null,
                entered_by: actor.user_id
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'EXAM_MARKS_ENTER',
                entity_name: 'exam_marks',
                entity_id: null,
                new_values: { exam_id, student_id, total_marks, grade },
                ip_address: actor.ip_address
            });

            return {
                exam_id,
                student_id,
                theory_marks: theory_marks !== undefined ? parseFloat(theory_marks) : null,
                practical_marks: practical_marks !== undefined ? parseFloat(practical_marks) : null,
                total_marks: parseFloat(totalMarks.toFixed(2)),
                grade,
                grade_points,
                message: 'Marks entered successfully'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Bulk enter marks for multiple students
    bulkEnterMarks: async (exam_id, marksRecords, actor) => {
        if (!marksRecords || marksRecords.length === 0) {
            throw new AppError('No marks records provided', 400);
        }

        const exam = await examRepository.findById(exam_id);
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }

        // Get grading system
        const [gradingRows] = await dbPool.execute(
            'SELECT * FROM grading_system WHERE campus_id = ? AND is_active = TRUE',
            [exam.campus_id || 1]
        );

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            const preparedRecords = [];
            for (const record of marksRecords) {
                const { student_id, theory_marks, practical_marks, remarks } = record;

                if (!student_id) continue;

                // Calculate total
                let totalMarks = 0;
                if (exam.is_practical) {
                    const theory = parseFloat(theory_marks) || 0;
                    const practical = parseFloat(practical_marks) || 0;
                    totalMarks = theory + practical;
                } else {
                    totalMarks = parseFloat(theory_marks) || 0;
                }

                // Calculate percentage and grade
                const percentage = (totalMarks / exam.total_marks) * 100;
                const { grade, grade_points } = calculateGrade(percentage, gradingRows);

                preparedRecords.push({
                    exam_id: parseInt(exam_id),
                    student_id: parseInt(student_id),
                    theory_marks: theory_marks !== undefined ? parseFloat(theory_marks) : null,
                    practical_marks: practical_marks !== undefined ? parseFloat(practical_marks) : null,
                    total_marks: parseFloat(totalMarks.toFixed(2)),
                    grade,
                    grade_points,
                    remarks: remarks || null,
                    entered_by: actor.user_id
                });
            }

            const result = await examMarksRepository.bulkInsert(preparedRecords, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'EXAM_MARKS_BULK_ENTER',
                entity_name: 'exam_marks',
                entity_id: null,
                new_values: { exam_id, count: preparedRecords.length },
                ip_address: actor.ip_address
            });

            return {
                exam_id,
                total_records: preparedRecords.length,
                affected_rows: result.affectedRows,
                message: `${preparedRecords.length} marks records entered successfully`
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get marks by exam
    getMarksByExam: async (exam_id) => {
        const exam = await examRepository.findById(exam_id);
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }

        const marks = await examMarksRepository.findByExam(exam_id);

        // Add rank to each student
        const sortedMarks = [...marks].sort((a, b) => (b.total_marks || 0) - (a.total_marks || 0));
        const marksWithRank = sortedMarks.map((m, index) => ({
            ...m,
            rank: index + 1
        }));

        return {
            exam_id,
            exam_name: exam.name,
            total_marks: exam.total_marks,
            passing_marks: exam.passing_marks,
            students: marksWithRank
        };
    },

    // Get marks by student
    getMarksByStudent: async (student_id, academic_session_id) => {
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        return await examMarksRepository.findByStudent(student_id, academic_session_id);
    },

    // Get exam summary
    getExamSummary: async (exam_id) => {
        const exam = await examRepository.findById(exam_id);
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }

        const summary = await examMarksRepository.getExamSummary(exam_id);

        // Get student rank
        const marks = await examMarksRepository.findByExam(exam_id);
        const sortedMarks = [...marks].sort((a, b) => (b.total_marks || 0) - (a.total_marks || 0));
        const rankedStudents = sortedMarks.map((m, index) => ({
            ...m,
            rank: index + 1
        }));

        return {
            exam_id,
            exam_name: exam.name,
            total_marks: exam.total_marks,
            passing_marks: exam.passing_marks,
            summary,
            top_students: rankedStudents.slice(0, 3),
            students: rankedStudents
        };
    },

    // Verify marks for an exam
    verifyMarks: async (exam_id, actor) => {
        const exam = await examRepository.findById(exam_id);
        if (!exam) {
            throw new AppError('Exam not found', 404);
        }

        if (exam.is_published) {
            throw new AppError('Cannot verify marks for a published exam', 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await examMarksRepository.verify(exam_id, actor.user_id, connection);

            // Mark exam as published
            await examRepository.update(exam_id, {
                is_published: true,
                published_at: new Date(),
                updated_by: actor.user_id
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'EXAM_MARKS_VERIFY',
                entity_name: 'exams',
                entity_id: parseInt(exam_id),
                new_values: { is_published: true },
                ip_address: actor.ip_address
            });

            return { exam_id, message: 'Marks verified and exam published successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get student rank in exam
    getStudentRank: async (exam_id, student_id) => {
        const rank = await examMarksRepository.getStudentRank(exam_id, student_id);
        if (!rank) {
            throw new AppError('Student marks not found for this exam', 404);
        }
        return { exam_id, student_id, rank };
    }
};

module.exports = examMarksService;