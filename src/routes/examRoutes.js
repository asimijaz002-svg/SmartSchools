// ============================================
// FILE: src/routes/examRoutes.js
// PURPOSE: API route definitions for exams
// ============================================

const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const examMarksController = require('../controllers/examMarksController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// EXAM ROUTES
// ============================================

// Get all exams
router.get(
    '/',
    protect,
    checkPermission('read:exams'),
    examController.getExams
);

// Get exams by class
router.get(
    '/class/:class_id',
    protect,
    checkPermission('read:exams'),
    examController.getExamsByClass
);

// Get exam statistics
router.get(
    '/stats',
    protect,
    checkPermission('read:exams'),
    examController.getExamStats
);

// Get single exam
router.get(
    '/:id',
    protect,
    checkPermission('read:exams'),
    examController.getExam
);

// Create exam
router.post(
    '/',
    protect,
    checkPermission('write:exams'),
    examController.createExam
);

// Update exam
router.put(
    '/:id',
    protect,
    checkPermission('write:exams'),
    examController.updateExam
);

// Delete exam
router.delete(
    '/:id',
    protect,
    checkPermission('delete:exams'),
    examController.deleteExam
);

// ============================================
// EXAM MARKS ROUTES
// ============================================

// Get marks by exam
router.get(
    '/:exam_id/marks',
    protect,
    checkPermission('read:exams'),
    examMarksController.getMarksByExam
);

// Get marks by student
router.get(
    '/student/:student_id/marks',
    protect,
    checkPermission('read:exams'),
    examMarksController.getMarksByStudent
);

// Get exam summary
router.get(
    '/:exam_id/summary',
    protect,
    checkPermission('read:exams'),
    examMarksController.getExamSummary
);

// Enter or update marks
router.post(
    '/:exam_id/marks',
    protect,
    checkPermission('write:exams'),
    examMarksController.enterMarks
);

// Bulk enter marks
router.post(
    '/:exam_id/marks/bulk',
    protect,
    checkPermission('write:exams'),
    examMarksController.bulkEnterMarks
);

// Verify marks
router.patch(
    '/:exam_id/marks/verify',
    protect,
    checkPermission('write:exams'),
    examMarksController.verifyMarks
);

module.exports = router;