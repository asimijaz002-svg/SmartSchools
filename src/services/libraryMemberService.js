// ============================================
// FILE: src/services/libraryMemberService.js
// PURPOSE: Business logic for library members
// ============================================

const libraryMemberRepository = require('../repositories/libraryMemberRepository');
const studentRepository = require('../repositories/studentRepository');
const employeeRepository = require('../repositories/employeeRepository');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const libraryMemberService = {
    // Create member
    createMember: async (memberData, actor) => {
        const { member_type, student_id, employee_id, full_name, email, phone } = memberData;

        if (!member_type || !full_name) {
            throw new AppError('Member type and full name are required', 400);
        }

        // Validate student exists
        if (member_type === 'STUDENT' && student_id) {
            const student = await studentRepository.findById(student_id);
            if (!student) {
                throw new AppError('Student not found', 404);
            }
        }

        // Validate employee exists
        if (member_type === 'TEACHER' && employee_id) {
            const employee = await employeeRepository.findById(employee_id);
            if (!employee) {
                throw new AppError('Employee not found', 404);
            }
        }

        // Generate member code
        const memberCode = `LIB-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const result = await libraryMemberRepository.create({
            ...memberData,
            member_code: memberCode,
            membership_date: new Date().toISOString().split('T')[0],
            max_books_allowed: memberData.max_books_allowed || 3,
            max_days_allowed: memberData.max_days_allowed || 14
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'LIBRARY_MEMBER_CREATE',
            entity_name: 'library_members',
            entity_id: result.insertId,
            new_values: memberData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, member_code: memberCode, ...memberData };
    },

    // Get members with pagination
    getMembers: async (options) => {
        const page = parseInt(options.page) || 1;
        const limit = parseInt(options.limit) || 10;
        const offset = (page - 1) * limit;

        const members = await libraryMemberRepository.findAll({
            search: options.search || null,
            member_type: options.member_type || null,
            is_active: options.is_active !== undefined ? options.is_active : null,
            sortBy: options.sortBy || 'full_name',
            sortOrder: options.sortOrder || 'ASC',
            limit,
            offset,
            campus_id: options.campus_id || 1
        });

        const totalRecords = await libraryMemberRepository.countAll({
            search: options.search || null,
            member_type: options.member_type || null,
            is_active: options.is_active !== undefined ? options.is_active : null,
            campus_id: options.campus_id || 1
        });

        const totalPages = Math.ceil(totalRecords / limit);

        return {
            data: members,
            pagination: {
                page,
                limit,
                total_records: totalRecords,
                total_pages: totalPages
            }
        };
    },

    // Get member by ID
    getMemberById: async (id) => {
        const member = await libraryMemberRepository.findById(id);
        if (!member) {
            throw new AppError('Library member not found', 404);
        }
        return member;
    },

    // Update member
    updateMember: async (id, updateData, actor) => {
        const member = await libraryMemberRepository.findById(id);
        if (!member) {
            throw new AppError('Library member not found', 404);
        }

        await libraryMemberRepository.update(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'LIBRARY_MEMBER_UPDATE',
            entity_name: 'library_members',
            entity_id: parseInt(id),
            previous_values: member,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Member updated successfully' };
    }
};

module.exports = libraryMemberService;