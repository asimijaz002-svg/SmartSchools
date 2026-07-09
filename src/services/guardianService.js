// ============================================
// FILE: src/services/guardianService.js
// PURPOSE: Business logic for student guardians
// ============================================

const guardianRepository = require('../repositories/guardianRepository');
const studentRepository = require('../repositories/studentRepository');
const studentHistoryService = require('./studentHistoryService');
const auditService = require('./auditService');
const AppError = require('../utils/appError');

const guardianService = {
    // Create new guardian
    createGuardian: async (guardianData, actor) => {
        const { student_id, guardian_type_id, full_name, contact_number } = guardianData;

        // Validate student exists
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        // Check if guardian type already exists for this student
        const existingGuardians = await guardianRepository.findByStudent(student_id);
        const typeExists = existingGuardians.some(g => g.guardian_type_id === guardian_type_id && g.is_active);
        if (typeExists) {
            throw new AppError('This guardian type already exists for the student. Please update instead.', 400);
        }

        const result = await guardianRepository.create(guardianData);

        // Add to student history
        await studentHistoryService.addHistoryEvent({
            student_id,
            event_type: 'GUARDIAN_CHANGE',
            event_date: new Date(),
            description: `Guardian ${full_name} added`,
            new_values: guardianData,
            created_by: actor.user_id
        });

        await auditService.log({
            user_id: actor.user_id,
            action: 'GUARDIAN_ADD',
            entity_name: 'student_guardians',
            entity_id: result.insertId,
            new_values: guardianData,
            ip_address: actor.ip_address
        });

        return { id: result.insertId, ...guardianData };
    },

    // Get guardians by student
    getGuardiansByStudent: async (student_id) => {
        const student = await studentRepository.findById(student_id);
        if (!student) {
            throw new AppError('Student not found', 404);
        }

        return await guardianRepository.findByStudent(student_id);
    },

    // Get guardian by ID
    getGuardianById: async (id) => {
        const guardian = await guardianRepository.findById(id);
        if (!guardian) {
            throw new AppError('Guardian not found', 404);
        }
        return guardian;
    },

    // Update guardian
    updateGuardian: async (id, updateData, actor) => {
        const guardian = await guardianRepository.findById(id);
        if (!guardian) {
            throw new AppError('Guardian not found', 404);
        }

        await guardianRepository.update(id, updateData);

        await auditService.log({
            user_id: actor.user_id,
            action: 'GUARDIAN_UPDATE',
            entity_name: 'student_guardians',
            entity_id: parseInt(id),
            previous_values: guardian,
            new_values: updateData,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Guardian updated successfully' };
    },

    // Delete guardian
    deleteGuardian: async (id, actor) => {
        const guardian = await guardianRepository.findById(id);
        if (!guardian) {
            throw new AppError('Guardian not found', 404);
        }

        await guardianRepository.delete(id);

        await auditService.log({
            user_id: actor.user_id,
            action: 'GUARDIAN_DELETE',
            entity_name: 'student_guardians',
            entity_id: parseInt(id),
            previous_values: guardian,
            new_values: null,
            ip_address: actor.ip_address
        });

        return { id: parseInt(id), message: 'Guardian deleted successfully' };
    },

    // Get guardian types
    getGuardianTypes: async () => {
        return await guardianRepository.getGuardianTypes();
    }
};

module.exports = guardianService;