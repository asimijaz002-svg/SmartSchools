// ============================================
// FILE: src/controllers/subjectController.js
// PURPOSE: Request/Response handlers for subjects
// ============================================

const subjectService = require('../services/subjectService');
const AppError = require('../utils/appError');

const subjectController = {
    // Create new subject
    createSubject: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await subjectService.createSubject({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Subject created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all subjects with pagination and filters
    getSubjects: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await subjectService.getSubjects({
                ...req.query,
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

    // Get single subject
    getSubject: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await subjectService.getSubjectById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get subjects by education level
    getSubjectsByLevel: async (req, res, next) => {
        try {
            const { education_level } = req.params;
            const { academic_session_id } = req.query;
            const campus_id = req.campusId;

            const result = await subjectService.getSubjectsByLevel({
                education_level,
                academic_session_id,
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

    // Get subjects by class
    getSubjectsByClass: async (req, res, next) => {
        try {
            const { class_id } = req.params;
            const { academic_session_id } = req.query;
            const campus_id = req.campusId;

            const result = await subjectService.getSubjectsByClass({
                class_id,
                academic_session_id,
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

    // Get subject groups
    getSubjectGroups: async (req, res, next) => {
        try {
            const result = await subjectService.getSubjectGroups();

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get education levels
    getEducationLevels: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await subjectService.getEducationLevels(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get subject statistics
    getSubjectStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await subjectService.getSubjectStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Update subject
    updateSubject: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await subjectService.updateSubject(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Subject updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Delete subject
    deleteSubject: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await subjectService.deleteSubject(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Subject deactivated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Link subject to class
    linkToClass: async (req, res, next) => {
        try {
            const { subject_id, class_id } = req.params;
            const { is_core, total_periods_per_week, is_mandatory } = req.body;

            const result = await subjectService.linkSubjectToClass({
                subject_id: parseInt(subject_id),
                class_id: parseInt(class_id),
                is_core,
                total_periods_per_week,
                is_mandatory
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(200).json({
                success: true,
                message: 'Subject linked to class successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Unlink subject from class
    unlinkFromClass: async (req, res, next) => {
        try {
            const { subject_id, class_id } = req.params;

            const result = await subjectService.unlinkSubjectFromClass({
                subject_id: parseInt(subject_id),
                class_id: parseInt(class_id)
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(200).json({
                success: true,
                message: 'Subject unlinked from class successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = subjectController;