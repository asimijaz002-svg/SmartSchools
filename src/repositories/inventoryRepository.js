// ============================================
// FILE: src/repositories/inventoryRepository.js
// PURPOSE: Database operations for inventory
// ============================================

const db = require('../config/db');

const inventoryRepository = {
    // ============================================
    // ITEM OPERATIONS
    // ============================================

    createItem: async (itemData, connection = null) => {
        const client = connection || db;
        const {
            item_code = null, name = null, description = null,
            category_id = null, unit = null, quantity = 0,
            minimum_quantity = 0, maximum_quantity = null,
            reorder_level = 0, purchase_price = 0, selling_price = 0,
            supplier_id = null, location = null, expiry_date = null,
            campus_id = 1, created_by = null
        } = itemData;

        if (!item_code) throw new Error('item_code is required');
        if (!name) throw new Error('name is required');
        if (!category_id) throw new Error('category_id is required');
        if (!unit) throw new Error('unit is required');

        const query = `
            INSERT INTO inventory_items (
                item_code, name, description, category_id, unit,
                quantity, minimum_quantity, maximum_quantity, reorder_level,
                purchase_price, selling_price, supplier_id, location,
                expiry_date, campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            item_code, name, description, category_id, unit,
            quantity, minimum_quantity, maximum_quantity, reorder_level,
            purchase_price, selling_price, supplier_id, location,
            expiry_date, campus_id, created_by
        ]);
        return result;
    },

    findItemById: async (id) => {
        const query = `
            SELECT i.*, c.name as category_name, s.name as supplier_name
            FROM inventory_items i
            LEFT JOIN inventory_categories c ON i.category_id = c.id
            LEFT JOIN suppliers s ON i.supplier_id = s.id
            WHERE i.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    findItemByCode: async (item_code, campus_id) => {
        const query = `SELECT * FROM inventory_items WHERE item_code = ? AND campus_id = ?`;
        const [rows] = await db.execute(query, [item_code, campus_id || 1]);
        return rows[0];
    },

    getAllItems: async ({ search, category_id, status, sortBy, sortOrder, limit, offset, campus_id }) => {
        let query = `
            SELECT i.*, c.name as category_name
            FROM inventory_items i
            LEFT JOIN inventory_categories c ON i.category_id = c.id
            WHERE i.campus_id = ?
        `;
        const queryParams = [campus_id || 1];

        if (category_id) {
            query += ` AND i.category_id = ?`;
            queryParams.push(category_id);
        }

        if (status) {
            query += ` AND i.status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (i.name LIKE ? OR i.item_code LIKE ? OR i.description LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allowedSortFields = ['name', 'quantity', 'purchase_price', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY i.${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    updateItem: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'name', 'description', 'category_id', 'unit', 'quantity',
            'minimum_quantity', 'maximum_quantity', 'reorder_level',
            'purchase_price', 'selling_price', 'supplier_id', 'location',
            'expiry_date', 'status', 'updated_by'
        ];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (fields.length === 0) return { affectedRows: 0 };

        values.push(id);
        const query = `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    updateQuantity: async (id, quantity, connection = null) => {
        const client = connection || db;
        const query = `UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?`;
        const [result] = await client.execute(query, [quantity, id]);
        return result;
    },

    // ============================================
    // SUPPLIER OPERATIONS
    // ============================================

    createSupplier: async (supplierData, connection = null) => {
        const client = connection || db;
        const {
            supplier_code = null, name = null, contact_person = null,
            phone = null, email = null, address = null, city = null,
            state = null, country = 'Pakistan', tax_number = null,
            payment_terms = null, campus_id = 1, created_by = null
        } = supplierData;

        if (!supplier_code) throw new Error('supplier_code is required');
        if (!name) throw new Error('name is required');
        if (!phone) throw new Error('phone is required');

        const query = `
            INSERT INTO suppliers (
                supplier_code, name, contact_person, phone, email,
                address, city, state, country, tax_number,
                payment_terms, campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            supplier_code, name, contact_person, phone, email,
            address, city, state, country, tax_number,
            payment_terms, campus_id, created_by
        ]);
        return result;
    },

    findAllSuppliers: async ({ search, status, campus_id }) => {
        let query = `SELECT * FROM suppliers WHERE campus_id = ?`;
        const queryParams = [campus_id || 1];

        if (status) {
            query += ` AND status = ?`;
            queryParams.push(status);
        }

        if (search) {
            query += ` AND (name LIKE ? OR supplier_code LIKE ? OR phone LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY name`;

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    findSupplierById: async (id) => {
        const query = `SELECT * FROM suppliers WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    // ============================================
    // STOCK TRANSACTION OPERATIONS
    // ============================================

    createStockTransaction: async (transactionData, connection = null) => {
        const client = connection || db;
        const {
            item_id = null, transaction_type = null, quantity = null,
            reference_type = null, reference_id = null,
            unit_price = 0, total_price = 0, reason = null,
            remarks = null, performed_by = null, campus_id = 1
        } = transactionData;

        const query = `
            INSERT INTO stock_transactions (
                item_id, transaction_type, quantity, reference_type,
                reference_id, unit_price, total_price, reason,
                remarks, performed_by, campus_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            item_id, transaction_type, quantity, reference_type,
            reference_id, unit_price, total_price, reason,
            remarks, performed_by, campus_id
        ]);
        return result;
    },

    getItemTransactionHistory: async (item_id, limit = 20) => {
        const query = `
            SELECT * FROM stock_transactions
            WHERE item_id = ?
            ORDER BY transaction_date DESC
            LIMIT ?
        `;
        const [rows] = await db.execute(query, [item_id, limit]);
        return rows;
    },

    // ============================================
    // STATISTICS
    // ============================================

    getInventoryStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_items,
                SUM(quantity) as total_quantity,
                COUNT(CASE WHEN quantity <= reorder_level AND quantity > 0 THEN 1 END) as items_needing_reorder,
                COUNT(CASE WHEN quantity = 0 THEN 1 END) as out_of_stock_items,
                SUM(quantity * purchase_price) as total_inventory_value,
                COUNT(DISTINCT category_id) as total_categories,
                COUNT(DISTINCT supplier_id) as total_suppliers
            FROM inventory_items
            WHERE campus_id = ?
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    },

    getLowStockItems: async (campus_id) => {
        const query = `
            SELECT i.*, c.name as category_name
            FROM inventory_items i
            LEFT JOIN inventory_categories c ON i.category_id = c.id
            WHERE i.campus_id = ? AND i.quantity <= i.reorder_level AND i.quantity > 0
            ORDER BY i.quantity ASC
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows;
    },

    getCategoryStats: async (campus_id) => {
        const query = `
            SELECT c.name, c.code, COUNT(i.id) as item_count, SUM(i.quantity) as total_quantity
            FROM inventory_categories c
            LEFT JOIN inventory_items i ON c.id = i.category_id
            WHERE c.campus_id = ?
            GROUP BY c.id
            ORDER BY item_count DESC
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows;
    }
};

module.exports = inventoryRepository;