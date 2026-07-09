// ============================================
// FILE: src/services/feeCategoryService.js
// PURPOSE: Business logic for fee categories
// ============================================

const feeCategoryRepository = require('../repositories/feeCategoryRepository');
const sessionRepository = require('../repositories/sessionRepository');
const classRepository = require('../repositories/classRepository');
const dbPool = require('../config/db');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const feeCategoryService = {
    // Create new fee category
    createFeeCategory: async (feeData, actor) => {
        const {
            code, name, fee_group, fee_type, fee_category,
            default_amount, academic_session_id, campus_id
        } = feeData;

        // Validate required fields
        if (!code || !name || !fee_group || !fee_type || 
            !fee_category || !academic_session_id) {
            throw new AppError('Missing required fields. Please provide code, name, fee_group, fee_type, fee_category, and academic_session_id', 400);
        }

        // Validate academic session exists
        const session = await sessionRepository.findById(academic_session_id);
        if (!session) {
            throw new AppError('Invalid academic session. Please select a valid session.', 400);
        }

        // Validate fee group
        const validGroups = ['TUITION', 'TRANSPORT', 'LIBRARY', 'LAB', 'SPORTS', 'EXAM', 'REGISTRATION', 'LATE_FINE', 'OTHER'];
        if (!validGroups.includes(fee_group)) {
            throw new AppError(`Invalid fee group. Must be one of: ${validGroups.join(', ')}`, 400);
        }

        // Validate fee type
        const validTypes = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'PER_SEMESTER', 'ONE_TIME', 'PER_TERM'];
        if (!validTypes.includes(fee_type)) {
            throw new AppError(`Invalid fee type. Must be one of: ${validTypes.join(', ')}`, 400);
        }

        // Validate fee category
        const validCategories = ['CORE', 'OPTIONAL', 'MANDATORY', 'ELECTIVE'];
        if (!validCategories.includes(fee_category)) {
            throw new AppError(`Invalid fee category. Must be one of: ${validCategories.join(', ')}`, 400);
        }

        // Check duplicate code
        const existing = await feeCategoryRepository.findByCode(code, academic_session_id, campus_id);
        if (existing) {
            throw new AppError('Fee category with this code already exists in the selected session.', 400);
        }

        // Check duplicate name
        const existingName = await feeCategoryRepository.findByName(name, academic_session_id, campus_id);
        if (existingName) {
            throw new AppError('Fee category with this name already exists in the selected session.', 400);
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            const result = await feeCategoryRepository.create({
                code,
                name,
                description: feeData.description || null,
                fee_group,
                fee_type,
                fee_category,
                default_amount: default_amount || 0,
                minimum_amount: feeData.minimum_amount || null,
                maximum_amount: feeData.maximum_amount || null,
                tax_percentage: feeData.tax_percentage || 0,
                discount_allowed: feeData.discount_allowed !== undefined ? feeData.discount_allowed : true,
                scholarship_eligible: feeData.scholarship_eligible !== undefined ? feeData.scholarship_eligible : true,
                billing_frequency: feeData.billing_frequency || 'MONTHLY',
                due_day: feeData.due_day || 10,
                late_fee_amount: feeData.late_fee_amount || 0,
                late_fee_after_days: feeData.late_fee_after_days || 5,
                is_refundable: feeData.is_refundable || false,
                applies_to_all_students: feeData.applies_to_all_students !== undefined ? feeData.applies_to_all_students : true,
                is_active: feeData.is_active !== undefined ? feeData.is_active : true,
                is_compulsory: feeData.is_compulsory || false,
                academic_session_id,
                campus_id: campus_id || 1,
                created_by: actor.user_id
            }, connection);

            // If class_ids provided, link fee to classes
            if (feeData.class_ids && feeData.class_ids.length > 0) {
                for (const classId of feeData.class_ids) {
                    const classExists = await classRepository.findById(classId);
                    if (classExists) {
                        await feeCategoryRepository.linkToClass({
                            fee_category_id: result.insertId,
                            class_id: classId,
                            amount: feeData.default_amount || 0
                        }, connection);
                    }
                }
            }

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'FEE_CATEGORY_CREATE',
                entity_name: 'fee_categories',
                entity_id: result.insertId,
                previous_values: null,
                new_values: feeData,
                ip_address: actor.ip_address
            });

            return { id: result.insertId, ...feeData };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Get all fee categories with pagination and filters
    getFeeCategories: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        // If no session provided, try to get active session
        let academicSessionId = options.academic_session_id;
        if (!academicSessionId) {
            const activeSession = await sessionRepository.getActiveSession(options.campus_id || 1);
            academicSessionId = activeSession ? activeSession.id : null;
        }

        if (!academicSessionId) {
            throw new AppError('No active academic session found. Please specify academic_session_id.', 400);
        }

        const feeCategories = await feeCategoryRepository.findAll({
            search: options.search || null,
            fee_group: options.fee_group || null,
            fee_type: options.fee_type || null,
            fee_category: options.fee_category || null,
            is_active: options.is_active !== undefined ? options.is_active : null,
            is_compulsory: options.is_compulsory !== undefined ? options.is_compulsory : null,
            academic_session_id: academicSessionId,
            sortBy: options.sortBy || 'name',
            sortOrder: options.sortOrder || 'ASC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = await feeCategoryRepository.countAll({
            search: options.search || null,
            fee_group: options.fee_group || null,
            fee_type: options.fee_type || null,
            fee_category: options.fee_category || null,
            is_active: options.is_active !== undefined ? options.is_active : null,
            is_compulsory: options.is_compulsory !== undefined ? options.is_compulsory : null,
            academic_session_id: academicSessionId,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: feeCategories,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages,
                academic_session_id: academicSessionId
            }
        };
    },

    // Get fee category by ID
    getFeeCategoryById: async (id) => {
        const feeCategory = await feeCategoryRepository.findById(id);
        if (!feeCategory) {
            throw new AppError('Fee category not found', 404);
        }

        // Get class links
        const classLinks = await feeCategoryRepository.getClassLinks(id);
        feeCategory.class_links = classLinks;

        return feeCategory;
    },

    // Get fee categories by class
    getFeeCategoriesByClass: async ({ class_id, academic_session_id, campus_id }) => {
        if (!class_id) {
            throw new AppError('Class ID is required.', 400);
        }

        const session = await sessionRepository.getActiveSession(campus_id || 1);
        const sessionId = academic_session_id || (session ? session.id : null);

        if (!sessionId) {
            throw new AppError('No active academic session found.', 404);
        }

        return await feeCategoryRepository.findByClass(class_id, sessionId);
    },

    // Get fee groups
    getFeeGroups: async () => {
        return await feeCategoryRepository.getFeeGroups();
    },

    // Get fee types
    getFeeTypes: async () => {
        return await feeCategoryRepository.getFeeTypes();
    },

    // Get fee categories (for dropdown)
    getFeeCategories: async () => {
        return await feeCategoryRepository.getFeeCategories();
    },

    // Update fee category
    updateFeeCategory: async (id, updateData, actor) => {
        const feeCategory = await feeCategoryRepository.findById(id);
        if (!feeCategory) {
            throw new AppError('Fee category not found', 404);
        }

        // Check duplicate code
        if (updateData.code && updateData.code !== feeCategory.code) {
            const existing = await feeCategoryRepository.findByCode(
                updateData.code,
                updateData.academic_session_id || feeCategory.academic_session_id,
                feeCategory.campus_id
            );
            if (existing && existing.id !== parseInt(id)) {
                throw new AppError('Fee category with this code already exists.', 400);
            }
        }

        // Check duplicate name
        if (updateData.name && updateData.name !== feeCategory.name) {
            const existing = await feeCategoryRepository.findByName(
                updateData.name,
                updateData.academic_session_id || feeCategory.academic_session_id,
                feeCategory.campus_id
            );
            if (existing && existing.id !== parseInt(id)) {
                throw new AppError('Fee category with this name already exists.', 400);
            }
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await feeCategoryRepository.update(id, {
                code: updateData.code || feeCategory.code,
                name: updateData.name || feeCategory.name,
                description: updateData.description !== undefined ? updateData.description : feeCategory.description,
                fee_group: updateData.fee_group || feeCategory.fee_group,
                fee_type: updateData.fee_type || feeCategory.fee_type,
                fee_category: updateData.fee_category || feeCategory.fee_category,
                default_amount: updateData.default_amount !== undefined ? updateData.default_amount : feeCategory.default_amount,
                minimum_amount: updateData.minimum_amount !== undefined ? updateData.minimum_amount : feeCategory.minimum_amount,
                maximum_amount: updateData.maximum_amount !== undefined ? updateData.maximum_amount : feeCategory.maximum_amount,
                tax_percentage: updateData.tax_percentage !== undefined ? updateData.tax_percentage : feeCategory.tax_percentage,
                discount_allowed: updateData.discount_allowed !== undefined ? updateData.discount_allowed : feeCategory.discount_allowed,
                scholarship_eligible: updateData.scholarship_eligible !== undefined ? updateData.scholarship_eligible : feeCategory.scholarship_eligible,
                billing_frequency: updateData.billing_frequency || feeCategory.billing_frequency,
                due_day: updateData.due_day || feeCategory.due_day,
                late_fee_amount: updateData.late_fee_amount !== undefined ? updateData.late_fee_amount : feeCategory.late_fee_amount,
                late_fee_after_days: updateData.late_fee_after_days || feeCategory.late_fee_after_days,
                is_refundable: updateData.is_refundable !== undefined ? updateData.is_refundable : feeCategory.is_refundable,
                applies_to_all_students: updateData.applies_to_all_students !== undefined ? updateData.applies_to_all_students : feeCategory.applies_to_all_students,
                is_active: updateData.is_active !== undefined ? updateData.is_active : feeCategory.is_active,
                is_compulsory: updateData.is_compulsory !== undefined ? updateData.is_compulsory : feeCategory.is_compulsory,
                updated_by: actor.user_id
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'FEE_CATEGORY_UPDATE',
                entity_name: 'fee_categories',
                entity_id: parseInt(id),
                previous_values: feeCategory,
                new_values: updateData,
                ip_address: actor.ip_address
            });

            return { id: parseInt(id), message: 'Fee category updated successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Delete fee category
    deleteFeeCategory: async (id, actor) => {
        const feeCategory = await feeCategoryRepository.findById(id);
        if (!feeCategory) {
            throw new AppError('Fee category not found', 404);
        }

        // Check if fee category has invoices
        const hasInvoices = await feeCategoryRepository.hasInvoices(id);
        if (hasInvoices) {
            throw new AppError('Cannot delete fee category with existing invoices. Please deactivate instead.', 400);
        }

        await feeCategoryRepository.delete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'FEE_CATEGORY_DELETE',
            entity_name: 'fee_categories',
            entity_id: parseInt(id),
            previous_values: feeCategory,
            new_values: null,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Fee category deactivated successfully' };
    },

    // Link fee category to class
    linkToClass: async (linkData, actor) => {
        const { fee_category_id, class_id, amount } = linkData;

        // Validate fee category exists
        const feeCategory = await feeCategoryRepository.findById(fee_category_id);
        if (!feeCategory) {
            throw new AppError('Fee category not found.', 404);
        }

        // Validate class exists with error handling
        try {
            const classExists = await classRepository.findById(class_id);
            if (!classExists) {
                throw new AppError('Class not found.', 404);
            }
        } catch (error) {
            if (error.code === 'ER_BAD_FIELD_ERROR') {
                const [rows] = await dbPool.execute('SELECT id FROM classes WHERE id = ?', [class_id]);
                if (rows.length === 0) {
                    throw new AppError('Class not found.', 404);
                }
            } else {
                throw error;
            }
        }

        const connection = await dbPool.getConnection();
        try {
            await connection.beginTransaction();

            await feeCategoryRepository.linkToClass({
                fee_category_id,
                class_id,
                amount: amount || feeCategory.default_amount || 0
            }, connection);

            await connection.commit();

            await auditService.log({
                user_id: actor.user_id,
                action: 'FEE_CATEGORY_LINK_CLASS',
                entity_name: 'fee_category_classes',
                entity_id: null,
                previous_values: null,
                new_values: linkData,
                ip_address: actor.ip_address
            });

            return { message: 'Fee category linked to class successfully' };

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    // Unlink fee category from class
    unlinkFromClass: async ({ fee_category_id, class_id }, actor) => {
        await feeCategoryRepository.unlinkFromClass(fee_category_id, class_id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'FEE_CATEGORY_UNLINK_CLASS',
            entity_name: 'fee_category_classes',
            entity_id: null,
            previous_values: { fee_category_id, class_id },
            new_values: null,
            ip_address: actor.ip_address
        });

        return { message: 'Fee category unlinked from class successfully' };
    },

    // Get fee statistics
    getFeeStats: async (campus_id) => {
        return await feeCategoryRepository.getFeeStats(campus_id || 1);
    }
};

module.exports = feeCategoryService;