const db = require('../config/db');

const departmentRepository = {
    findAll: async (campus_id) => {
        const query = `SELECT * FROM departments WHERE campus_id = ? AND is_active = TRUE ORDER BY name`;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows;
    },
    findById: async (id) => {
        const query = `SELECT * FROM departments WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }
};

module.exports = departmentRepository;