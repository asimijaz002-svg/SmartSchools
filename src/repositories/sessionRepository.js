const db = require('../config/db');

const sessionRepository = {
  // Retrieve the currently active academic session
  getActiveSession: async () => {
    const query = `SELECT * FROM academic_sessions WHERE is_active = 1 LIMIT 1`;
    const [rows] = await db.execute(query);
    return rows[0];
  }
};

module.exports = sessionRepository;