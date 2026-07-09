// ============================================
// FILE: src/repositories/feeCategoryRepository.js
// PURPOSE: Database operations for fee categories
// ============================================

const db = require('../config/db');

const feeCategoryRepository = {
    // Create new fee category
    create: async (feeData, connection = null) => {
        const client = connection || db;
        const {
            code, name, description, fee_group, fee_type, fee_category,
            default_amount, minimum_amount, maximum_amount, tax_percentage,
            discount_allowed, scholarship_eligible, billing_frequency,
            due_day, late_fee_amount, late_fee_after_days, is_refundable,
            applies_to_all_students, is_active, is_compulsory,
            academic_session_id, campus_id, created_by
        } = feeData;

        const query = `
            INSERT INTO fee_categories (
                code, name, description, fee_group, fee_type, fee_category,
                default_amount, minimum_amount, maximum_amount, tax_percentage,
                discount_allowed, scholarship_eligible, billing_frequency,
                due_day, late_fee_amount, late_fee_after_days, is_refundable,
                applies_to_all_students, is_active, is_compulsory,
                academic_session_id, campus_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            code, name, description || null, fee_group, fee_type, fee_category,
            default_amount || 0, minimum_amount || null, maximum_amount || null,
            tax_percentage || 0, discount_allowed !== undefined ? discount_allowed : true,
            scholarship_eligible !== undefined ? scholarship_eligible : true,
            billing_frequency || 'MONTHLY', due_day || 10, late_fee_amount || 0,
            late_fee_after_days || 5, is_refundable || false,
            applies_to_all_students !== undefined ? applies_to_all_students : true,
            is_active !== undefined ? is_active : true,
            is_compulsory !== undefined ? is_compulsory : false,
            academic_session_id, campus_id || 1, created_by || null
        ]);
        return result;
    },

    // Find all fee categories with filters
    findAll: async ({
        search, fee_group, fee_type, fee_category, is_active, is_compulsory,
        academic_session_id, sortBy, sortOrder, limit, offset, campus_id
    }) => {
        let query = `
            SELECT fc.*,
                   (SELECT COUNT(*) FROM fee_category_classes fcc WHERE fcc.fee_category_id = fc.id) as class_count
            FROM fee_categories fc
            WHERE fc.campus_id = ? AND fc.academic_session_id = ?
        `;
        const queryParams = [campus_id || 1, academic_session_id];

        if (search) {
            query += ` AND (fc.code LIKE ? OR fc.name LIKE ? OR fc.description LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (fee_group) {
            query += ` AND fc.fee_group = ?`;
            queryParams.push(fee_group);
        }

        if (fee_type) {
            query += ` AND fc.fee_type = ?`;
            queryParams.push(fee_type);
        }

        if (fee_category) {
            query += ` AND fc.fee_category = ?`;
            queryParams.push(fee_category);
        }

        if (is_active !== undefined && is_active !== null) {
            query += ` AND fc.is_active = ?`;
            queryParams.push(is_active);
        }

        if (is_compulsory !== undefined && is_compulsory !== null) {
            query += ` AND fc.is_compulsory = ?`;
            queryParams.push(is_compulsory);
        }

        const allowedSortFields = ['code', 'name', 'fee_group', 'default_amount', 'created_at'];
        const sortByField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrderValue = (sortOrder && sortOrder.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
        
        query += ` ORDER BY fc.${sortByField} ${sortOrderValue}`;

        if (limit) {
            query += ` LIMIT ? OFFSET ?`;
            queryParams.push(parseInt(limit), parseInt(offset) || 0);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows;
    },

    // Count total fee categories (for pagination)
    countAll: async ({
        search, fee_group, fee_type, fee_category, is_active, is_compulsory,
        academic_session_id, campus_id
    }) => {
        let query = `
            SELECT COUNT(*) as total FROM fee_categories
            WHERE campus_id = ? AND academic_session_id = ?
        `;
        const queryParams = [campus_id || 1, academic_session_id];

        if (search) {
            query += ` AND (code LIKE ? OR name LIKE ? OR description LIKE ?)`;
            queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (fee_group) {
            query += ` AND fee_group = ?`;
            queryParams.push(fee_group);
        }

        if (fee_type) {
            query += ` AND fee_type = ?`;
            queryParams.push(fee_type);
        }

        if (fee_category) {
            query += ` AND fee_category = ?`;
            queryParams.push(fee_category);
        }

        if (is_active !== undefined && is_active !== null) {
            query += ` AND is_active = ?`;
            queryParams.push(is_active);
        }

        if (is_compulsory !== undefined && is_compulsory !== null) {
            query += ` AND is_compulsory = ?`;
            queryParams.push(is_compulsory);
        }

        const [rows] = await db.execute(query, queryParams);
        return rows[0].total;
    },

    // Find fee category by ID
    findById: async (id, connection = null) => {
        const client = connection || db;
        const query = `
            SELECT fc.*,
                   (SELECT COUNT(*) FROM fee_category_classes fcc WHERE fcc.fee_category_id = fc.id) as class_count
            FROM fee_categories fc
            WHERE fc.id = ?
        `;
        const [rows] = await client.execute(query, [id]);
        return rows[0];
    },

    // Find by code
    findByCode: async (code, academic_session_id, campus_id) => {
        const query = `
            SELECT * FROM fee_categories
            WHERE code = ? AND academic_session_id = ? AND campus_id = ?
        `;
        const [rows] = await db.execute(query, [code, academic_session_id, campus_id || 1]);
        return rows[0];
    },

    // Find by name
    findByName: async (name, academic_session_id, campus_id) => {
        const query = `
            SELECT * FROM fee_categories
            WHERE name = ? AND academic_session_id = ? AND campus_id = ?
        `;
        const [rows] = await db.execute(query, [name, academic_session_id, campus_id || 1]);
        return rows[0];
    },

    // Get fee categories by group
    findByGroup: async (fee_group, academic_session_id, campus_id) => {
        const query = `
            SELECT * FROM fee_categories
            WHERE fee_group = ? AND academic_session_id = ? AND campus_id = ? AND is_active = TRUE
            ORDER BY name
        `;
        const [rows] = await db.execute(query, [fee_group, academic_session_id, campus_id || 1]);
        return rows;
    },

    // Get fee categories by class
    findByClass: async (class_id, academic_session_id) => {
        const query = `
            SELECT fc.*, fcc.amount as class_amount
            FROM fee_categories fc
            JOIN fee_category_classes fcc ON fc.id = fcc.fee_category_id
            WHERE fcc.class_id = ? AND fc.academic_session_id = ? AND fc.is_active = TRUE
            ORDER BY fc.fee_group, fc.name
        `;
        const [rows] = await db.execute(query, [class_id, academic_session_id]);
        return rows;
    },

    // Update fee category
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const {
            code, name, description, fee_group, fee_type, fee_category,
            default_amount, minimum_amount, maximum_amount, tax_percentage,
            discount_allowed, scholarship_eligible, billing_frequency,
            due_day, late_fee_amount, late_fee_after_days, is_refundable,
            applies_to_all_students, is_active, is_compulsory, updated_by
        } = updateData;

        const query = `
            UPDATE fee_categories SET
                code = ?, name = ?, description = ?, fee_group = ?,
                fee_type = ?, fee_category = ?, default_amount = ?,
                minimum_amount = ?, maximum_amount = ?, tax_percentage = ?,
                discount_allowed = ?, scholarship_eligible = ?,
                billing_frequency = ?, due_day = ?, late_fee_amount = ?,
                late_fee_after_days = ?, is_refundable = ?,
                applies_to_all_students = ?, is_active = ?, is_compulsory = ?,
                updated_by = ?
            WHERE id = ?
        `;

        const [result] = await client.execute(query, [
            code, name, description || null, fee_group,
            fee_type, fee_category, default_amount || 0,
            minimum_amount || null, maximum_amount || null, tax_percentage || 0,
            discount_allowed !== undefined ? discount_allowed : true,
            scholarship_eligible !== undefined ? scholarship_eligible : true,
            billing_frequency || 'MONTHLY', due_day || 10, late_fee_amount || 0,
            late_fee_after_days || 5, is_refundable || false,
            applies_to_all_students !== undefined ? applies_to_all_students : true,
            is_active !== undefined ? is_active : true,
            is_compulsory !== undefined ? is_compulsory : false,
            updated_by || null, id
        ]);
        return result;
    },

    // Delete fee category (soft delete)
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `UPDATE fee_categories SET is_active = FALSE WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    },

    // Link fee category to class
    linkToClass: async ({ fee_category_id, class_id, amount }, connection = null) => {
        const client = connection || db;
        const query = `
            INSERT INTO fee_category_classes (fee_category_id, class_id, amount)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE amount = VALUES(amount), updated_at = CURRENT_TIMESTAMP
        `;
        const [result] = await client.execute(query, [fee_category_id, class_id, amount]);
        return result;
    },

    // Unlink fee category from class
    unlinkFromClass: async (fee_category_id, class_id, connection = null) => {
        const client = connection || db;
        const query = `DELETE FROM fee_category_classes WHERE fee_category_id = ? AND class_id = ?`;
        const [result] = await client.execute(query, [fee_category_id, class_id]);
        return result;
    },

    // Get class links for a fee category
    getClassLinks: async (fee_category_id) => {
        const query = `
            SELECT fcc.*, c.name as class_name, c.section as class_section
            FROM fee_category_classes fcc
            JOIN classes c ON fcc.class_id = c.id
            WHERE fcc.fee_category_id = ?
        `;
        const [rows] = await db.execute(query, [fee_category_id]);
        return rows;
    },

    // Get fee groups
    getFeeGroups: async () => {
        const query = `SELECT DISTINCT fee_group FROM fee_categories ORDER BY fee_group`;
        const [rows] = await db.execute(query);
        return rows.map(r => r.fee_group);
    },

    // Get fee types
    getFeeTypes: async () => {
        const query = `SELECT DISTINCT fee_type FROM fee_categories ORDER BY fee_type`;
        const [rows] = await db.execute(query);
        return rows.map(r => r.fee_type);
    },

    // Get fee categories
    getFeeCategories: async () => {
        const query = `SELECT DISTINCT fee_category FROM fee_categories ORDER BY fee_category`;
        const [rows] = await db.execute(query);
        return rows.map(r => r.fee_category);
    },

    // Check if fee category has invoices
    hasInvoices: async (fee_category_id) => {
        const query = `SELECT COUNT(*) as count FROM fee_invoices WHERE fee_category_id = ?`;
        const [rows] = await db.execute(query, [fee_category_id]);
        return rows[0].count > 0;
    },

    // Get fee category statistics
    getFeeStats: async (campus_id) => {
        const query = `
            SELECT 
                COUNT(*) as total_fees,
                SUM(CASE WHEN is_compulsory = TRUE THEN 1 ELSE 0 END) as compulsory_fees,
                SUM(CASE WHEN is_compulsory = FALSE THEN 1 ELSE 0 END) as optional_fees,
                SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_fees,
                COUNT(DISTINCT fee_group) as total_groups,
                ROUND(AVG(default_amount), 2) as average_amount,
                SUM(default_amount) as total_amount
            FROM fee_categories
            WHERE campus_id = ? AND is_active = TRUE
        `;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows[0];
    }
};

module.exports = feeCategoryRepository;