// ============================================
// FILE: src/routes/inventoryRoutes.js
// PURPOSE: API route definitions for inventory
// ============================================

const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { protect, checkPermission } = require('../middlewares/authMiddleware');

// ============================================
// ITEM ROUTES
// ============================================

router.get('/items', protect, checkPermission('read:inventory'), inventoryController.getItems);
router.get('/items/:id', protect, checkPermission('read:inventory'), inventoryController.getItem);
router.post('/items', protect, checkPermission('write:inventory'), inventoryController.createItem);
router.put('/items/:id', protect, checkPermission('write:inventory'), inventoryController.updateItem);
router.patch('/items/:id/quantity', protect, checkPermission('write:inventory'), inventoryController.updateQuantity);

// ============================================
// SUPPLIER ROUTES
// ============================================

router.get('/suppliers', protect, checkPermission('read:inventory'), inventoryController.getSuppliers);
router.get('/suppliers/:id', protect, checkPermission('read:inventory'), inventoryController.getSupplier);
router.post('/suppliers', protect, checkPermission('write:inventory'), inventoryController.createSupplier);
router.put('/suppliers/:id', protect, checkPermission('write:inventory'), inventoryController.updateSupplier);

// ============================================
// STOCK TRANSACTION ROUTES
// ============================================

router.get('/items/:item_id/history', protect, checkPermission('read:inventory'), inventoryController.getItemHistory);

// ============================================
// STATISTICS ROUTES
// ============================================

router.get('/stats', protect, checkPermission('read:inventory'), inventoryController.getInventoryStats);
router.get('/low-stock', protect, checkPermission('read:inventory'), inventoryController.getLowStockItems);
router.get('/category-stats', protect, checkPermission('read:inventory'), inventoryController.getCategoryStats);

module.exports = router;