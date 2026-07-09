// ============================================
// FILE: src/controllers/libraryMemberController.js
// PURPOSE: Request/Response handlers for library members
// ============================================

const libraryMemberService = require('../services/libraryMemberService');
const AppError = require('../utils/appError');

const libraryMemberController = {
    // Create member
    createMember: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await libraryMemberService.createMember({
                ...req.body,
                campus_id
            }, { user_id: req.user.id, ip_address: req.ip });

            res.status(201).json({
                success: true,
                message: 'Library member created successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Get all members
    getMembers: async (req, res, next) => {
        try {
            const campus_id = req.campusId;
            const result = await libraryMemberService.getMembers({
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

    // Get single member
    getMember: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await libraryMemberService.getMemberById(id);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    },

    // Update member
    updateMember: async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await libraryMemberService.updateMember(
                id,
                req.body,
                { user_id: req.user.id, ip_address: req.ip }
            );

            res.status(200).json({
                success: true,
                message: 'Member updated successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = libraryMemberController;