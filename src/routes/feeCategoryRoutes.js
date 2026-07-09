// ============================================
// FILE: src/routes/feeCategoryRoutes.js
// PURPOSE: API route definitions for fee categories
// ============================================

const express = require('express');
const router = express.Router();
const feeCategoryController = require('../controllers/feeCategoryController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// READ Operations
// ============================================

// Get all fee categories (with pagination and filters)
router.get(
    '/',
    protect,
    checkPermission('read:fees'),
    feeCategoryController.getFeeCategories
);

// Get fee groups (for dropdown)
router.get(
    '/groups',
    protect,
    checkPermission('read:fees'),
    feeCategoryController.getFeeGroups
);

// Get fee types (for dropdown)
router.get(
    '/types',
    protect,
    checkPermission('read:fees'),
    feeCategoryController.getFeeTypes
);

// Get fee categories list (for dropdown)
router.get(
    '/list',
    protect,
    checkPermission('read:fees'),
    feeCategoryController.getFeeCategoriesList
);

// Get fee statistics
router.get(
    '/stats',
    protect,
    checkPermission('read:fees'),
    feeCategoryController.getFeeStats
);

// Get fee categories by class
router.get(
    '/class/:class_id',
    protect,
    checkPermission('read:fees'),
    feeCategoryController.getFeeCategoriesByClass
);

// Get single fee category
router.get(
    '/:id',
    protect,
    checkPermission('read:fees'),
    feeCategoryController.getFeeCategory
);

// ============================================
// WRITE Operations
// ============================================

// Create new fee category
router.post(
    '/',
    protect,
    checkPermission('write:fees'),
    feeCategoryController.createFeeCategory
);

// Update fee category
router.put(
    '/:id',
    protect,
    checkPermission('write:fees'),
    feeCategoryController.updateFeeCategory
);

// Delete fee category
router.delete(
    '/:id',
    protect,
    checkPermission('write:fees'),
    feeCategoryController.deleteFeeCategory
);

// ============================================
// CLASS LINKING Operations
// ============================================

// Link fee category to class
router.post(
    '/:fee_category_id/class/:class_id/link',
    protect,
    checkPermission('write:fees'),
    feeCategoryController.linkToClass
);

// Unlink fee category from class
router.delete(
    '/:fee_category_id/class/:class_id/unlink',
    protect,
    checkPermission('write:fees'),
    feeCategoryController.unlinkFromClass
);

module.exports = router;