// ============================================
// FILE: src/controllers/inventoryController.js
// PURPOSE: Request/Response handlers for inventory
// ============================================

const inventoryService = require('../services/inventoryService');
const AppError = require('../utils/appError');

const inventoryController = {
    // ============================================
    // ITEM CONTROLLERS
    // ============================================

    createItem: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await inventoryService.createItem({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Inventory item created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getItems: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await inventoryService.getItems({
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

    getItem: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await inventoryService.getItemById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateItem: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await inventoryService.updateItem(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Item updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateQuantity: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { quantity, transaction_type, reason } = req.body;

            if (quantity === undefined || !transaction_type) {
                return next(new AppError('Quantity and transaction_type are required', 400));
            }

            const result = await inventoryService.updateItemQuantity(
                id,
                quantity,
                transaction_type,
                reason || null,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Item quantity updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // SUPPLIER CONTROLLERS
    // ============================================

    createSupplier: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await inventoryService.createSupplier({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Supplier created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getSuppliers: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await inventoryService.getSuppliers({
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

    getSupplier: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await inventoryService.getSupplierById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    updateSupplier: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await inventoryService.updateSupplier(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Supplier updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // STOCK TRANSACTION CONTROLLERS
    // ============================================

    getItemHistory: async (req, res, next) => {
        try {
            const { item_id } = req.params;
            const { limit } = req.query;
            const result = await inventoryService.getItemHistory(item_id, limit);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // ============================================
    // STATISTICS CONTROLLERS
    // ============================================

    getInventoryStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await inventoryService.getInventoryStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getLowStockItems: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await inventoryService.getLowStockItems(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    getCategoryStats: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await inventoryService.getCategoryStats(campus_id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = inventoryController;