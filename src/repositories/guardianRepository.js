// ============================================
// FILE: src/repositories/guardianRepository.js
// PURPOSE: Database operations for student guardians
// ============================================

const db = require('../config/db');

const guardianRepository = {
    // Create guardian (FIXED - handles undefined values)
    create: async (guardianData, connection = null) => {
        const client = connection || db;
        const {
            student_id = null,
            guardian_type_id = null,
            full_name = null,
            cnic = null,
            contact_number = null,
            alternative_contact = null,
            email = null,
            occupation = null,
            education = null,
            designation = null,
            company_name = null,
            office_address = null,
            residential_address = null,
            relationship = null,
            is_emergency_contact = 0,
            is_financially_responsible = 1
        } = guardianData;

        const query = `
            INSERT INTO student_guardians (
                student_id, guardian_type_id, full_name, cnic, contact_number,
                alternative_contact, email, occupation, education, designation,
                company_name, office_address, residential_address, relationship,
                is_emergency_contact, is_financially_responsible
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await client.execute(query, [
            student_id, guardian_type_id, full_name, cnic, contact_number,
            alternative_contact, email, occupation, education, designation,
            company_name, office_address, residential_address, relationship,
            is_emergency_contact, is_financially_responsible
        ]);
        return result;
    },

    // Find guardian by ID
    findById: async (id) => {
        const query = `
            SELECT sg.*, gt.name as guardian_type_name
            FROM student_guardians sg
            JOIN guardian_types gt ON sg.guardian_type_id = gt.id
            WHERE sg.id = ?
        `;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    },

    // Find guardians by student
    findByStudent: async (student_id) => {
        const query = `
            SELECT sg.*, gt.name as guardian_type_name, gt.is_primary
            FROM student_guardians sg
            JOIN guardian_types gt ON sg.guardian_type_id = gt.id
            WHERE sg.student_id = ? AND sg.is_active = TRUE
            ORDER BY gt.is_primary DESC
        `;
        const [rows] = await db.execute(query, [student_id]);
        return rows;
    },

    // Find primary guardian
    findPrimaryGuardian: async (student_id) => {
        const query = `
            SELECT sg.*, gt.name as guardian_type_name
            FROM student_guardians sg
            JOIN guardian_types gt ON sg.guardian_type_id = gt.id
            WHERE sg.student_id = ? AND gt.is_primary = TRUE AND sg.is_active = TRUE
        `;
        const [rows] = await db.execute(query, [student_id]);
        return rows[0];
    },

    // Update guardian
    update: async (id, updateData, connection = null) => {
        const client = connection || db;
        const fields = [];
        const values = [];

        const allowedFields = [
            'guardian_type_id', 'full_name', 'cnic', 'contact_number',
            'alternative_contact', 'email', 'occupation', 'education',
            'designation', 'company_name', 'office_address', 'residential_address',
            'relationship', 'is_emergency_contact', 'is_financially_responsible', 'is_active'
        ];

        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        }

        if (fields.length === 0) {
            return { affectedRows: 0 };
        }

        values.push(id);
        const query = `UPDATE student_guardians SET ${fields.join(', ')} WHERE id = ?`;
        const [result] = await client.execute(query, values);
        return result;
    },

    // Delete guardian (soft delete)
    delete: async (id, connection = null) => {
        const client = connection || db;
        const query = `UPDATE student_guardians SET is_active = FALSE WHERE id = ?`;
        const [result] = await client.execute(query, [id]);
        return result;
    },

    // Get guardian types
    getGuardianTypes: async () => {
        const query = `SELECT * FROM guardian_types ORDER BY is_primary DESC, name`;
        const [rows] = await db.execute(query);
        return rows;
    }
};

module.exports = guardianRepository;