// ============================================
// FILE: src/services/inventoryService.js
// PURPOSE: Business logic for inventory
// ============================================

const dbPool = require('../config/db');  // 👈 ADD THIS
const inventoryRepository = require('../repositories/inventoryRepository');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const inventoryService = {
    // ============================================
    // ITEM SERVICES
    // ============================================

    createItem: async (itemData, actor) => {
        const { item_code, name, category_id, unit, quantity } = itemData;

        if (!item_code || !name || !category_id || !unit) {
            throw new AppError('item_code, name, category_id, and unit are required', 400);
        }

        // Check duplicate item code
        const existing = await inventoryRepository.findItemByCode(item_code, itemData.campus_id);
        if (existing) {
            throw new AppError('Item code already exists', 400);
        }

        const result = await inventoryRepository.createItem({
            ...itemData,
            created_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'INVENTORY_ITEM_CREATE',
            entity_name: 'inventory_items',
            entity_id: result.insertId,
            new_values: itemData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, ...itemData };
    },

    getItems: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const items = await inventoryRepository.getAllItems({
            search: options.search || null,
            category_id: options.category_id || null,
            status: options.status || null,
            sortBy: options.sortBy || 'created_at',
            sortOrder: options.sortOrder || 'DESC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        return {
            data: items,
            pagination: {
                page,
                limit,
                total_records: items.length,
                total_pages: Math.ceil(items.length / limit)
            }
        };
    },

    getItemById: async (id) => {
        const item = await inventoryRepository.findItemById(id);
        if (!item) {
            throw new AppError('Item not found', 404);
        }
        return item;
    },

    updateItem: async (id, updateData, actor) => {
        const item = await inventoryRepository.findItemById(id);
        if (!item) {
            throw new AppError('Item not found', 404);
        }

        updateData.updated_by = actor.user_id;
        await inventoryRepository.updateItem(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'INVENTORY_ITEM_UPDATE',
            entity_name: 'inventory_items',
            entity_id: parseInt(id),
            previous_values: item,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Item updated successfully' };
    },

    updateItemQuantity: async (id, quantity, transaction_type, reason, actor) => {
        const item = await inventoryRepository.findItemById(id);
        if (!item) {
            throw new AppError('Item not found', 404);
        }

        const quantityChange = transaction_type === 'IN' ? quantity : -quantity;
        const newQuantity = item.quantity + quantityChange;

        if (newQuantity < 0) {
            throw new AppError(`Insufficient stock. Current quantity: ${item.quantity}`, 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await inventoryRepository.updateQuantity(id, quantityChange, connection);

            await inventoryRepository.createStockTransaction({
                item_id: parseInt(id),
                transaction_type: transaction_type,
                quantity: quantity,
                reference_type: 'ADJUSTMENT',
                unit_price: item.purchase_price || 0,
                total_price: (item.purchase_price || 0) * quantity,
                reason: reason || 'Stock adjustment',
                performed_by: actor.user_id,
                campus_id: item.campus_id || 1
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'INVENTORY_QUANTITY_UPDATE',
                entity_name: 'inventory_items',
                entity_id: parseInt(id),
                previous_values: { quantity: item.quantity },
                new_values: { quantity: newQuantity, transaction_type },
                ip_address: actor.ip_address
            });

            return {
                id: parseInt(id),
                previous_quantity: item.quantity,
                new_quantity: newQuantity,
                transaction_type,
                message: 'Quantity updated successfully'
            };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // ============================================
    // SUPPLIER SERVICES
    // ============================================

    createSupplier: async (supplierData, actor) => {
        const { supplier_code, name, phone } = supplierData;

        if (!supplier_code || !name || !phone) {
            throw new AppError('supplier_code, name, and phone are required', 400);
        }

        const result = await inventoryRepository.createSupplier({
            ...supplierData,
            created_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'SUPPLIER_CREATE',
            entity_name: 'suppliers',
            entity_id: result.insertId,
            new_values: supplierData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, ...supplierData };
    },

    getSuppliers: async (options) => {
        const suppliers = await inventoryRepository.findAllSuppliers({
            search: options.search || null,
            status: options.status || null,
            campus_id: options.campus_id || 1
        });

        return { data: suppliers };
    },

    getSupplierById: async (id) => {
        const supplier = await inventoryRepository.findSupplierById(id);
        if (!supplier) {
            throw new AppError('Supplier not found', 404);
        }
        return supplier;
    },

    updateSupplier: async (id, updateData, actor) => {
        const supplier = await inventoryRepository.findSupplierById(id);
        if (!supplier) {
            throw new AppError('Supplier not found', 404);
        }

        await inventoryRepository.updateSupplier(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'SUPPLIER_UPDATE',
            entity_name: 'suppliers',
            entity_id: parseInt(id),
            previous_values: supplier,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Supplier updated successfully' };
    },

    // ============================================
    // STOCK TRANSACTION SERVICES
    // ============================================

    getItemHistory: async (item_id, limit = 20) => {
        const item = await inventoryRepository.findItemById(item_id);
        if (!item) {
            throw new AppError('Item not found', 404);
        }

        return await inventoryRepository.getItemTransactionHistory(item_id, limit);
    },

    // ============================================
    // STATISTICS SERVICES
    // ============================================

    getInventoryStats: async (campus_id) => {
        return await inventoryRepository.getInventoryStats(campus_id || 1);
    },

    getLowStockItems: async (campus_id) => {
        return await inventoryRepository.getLowStockItems(campus_id || 1);
    },

    getCategoryStats: async (campus_id) => {
        return await inventoryRepository.getCategoryStats(campus_id || 1);
    }
};

module.exports = inventoryService;