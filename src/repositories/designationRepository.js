const db = require('../config/db');

const designationRepository = {
    findAll: async (campus_id) => {
        const query = `SELECT * FROM designations WHERE campus_id = ? AND is_active = TRUE ORDER BY name`;
        const [rows] = await db.execute(query, [campus_id || 1]);
        return rows;
    },
    findById: async (id) => {
        const query = `SELECT * FROM designations WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }
};

module.exports = designationRepository;