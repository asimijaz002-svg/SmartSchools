// ============================================
// FILE: src/controllers/feeCategoryController.js
// PURPOSE: Request/Response handlers for fee categories
// ============================================

const feeCategoryService = require('../services/feeCategoryService');
const AppError = require('../utils/appError');

const feeCategoryController = {
    // Create new fee category
    createFeeCategory: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await feeCategoryService.createFeeCategory({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Fee category created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all fee categories with pagination and filters
    getFeeCategories: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await feeCategoryService.getFeeCategories({
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

    // Get single fee category
    getFeeCategory: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await feeCategoryService.getFeeCategoryById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get fee categories by class
    getFeeCategoriesByClass: async (req, res, next) => {
        try {
            const { class_id } = req.params;
            const { academic_session_id } = req.query;
            const campus_id = req.campusId;

            const result = await feeCategoryService.getFeeCategoriesByClass({
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

    // Get fee groups (for dropdown)
    getFeeGroups: async (req, res, next) => {
        try {
            const result = await feeCategoryService.getFeeGroups();

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get fee types (for dropdown)
    getFeeTypes: async (req, res, next) => {
        try {
            const result = await feeCategoryService.getFeeTypes();

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get fee categories (for dropdown)
    getFeeCategoriesList: async (req, res, next) => {
        try {
            const result = await feeCategoryService.getFeeCategories();

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get fee statistics
    getFeeStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await feeCategoryService.getFeeStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Update fee category
    updateFeeCategory: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await feeCategoryService.updateFeeCategory(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Fee category updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Delete fee category
    deleteFeeCategory: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await feeCategoryService.deleteFeeCategory(
                id,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Fee category deactivated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Link fee category to class
    linkToClass: async (req, res, next) => {
        try {
            const { fee_category_id, class_id } = req.params;
            const { amount } = req.body;

            const result = await feeCategoryService.linkToClass({
                fee_category_id: parseInt(fee_category_id),
                class_id: parseInt(class_id),
                amount: amount || 0
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(200).json({
                success: true,
                message: 'Fee category linked to class successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Unlink fee category from class
    unlinkFromClass: async (req, res, next) => {
        try {
            const { fee_category_id, class_id } = req.params;

            const result = await feeCategoryService.unlinkFromClass({
                fee_category_id: parseInt(fee_category_id),
                class_id: parseInt(class_id)
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(200).json({
                success: true,
                message: 'Fee category unlinked from class successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = feeCategoryController;