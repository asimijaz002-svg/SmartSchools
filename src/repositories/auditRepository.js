const db = require('../config/db');

const auditRepository = {
  create: async (auditData) => {
    const { user_id, action, entity_name, entity_id, previous_values, new_values, ip_address } = auditData;
    const query = `
      INSERT INTO audit_logs (user_id, action, entity_name, entity_id, previous_values, new_values, ip_address) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      user_id || null,
      action,
      entity_name,
      entity_id || null,
      previous_values ? JSON.stringify(previous_values) : null,
      new_values ? JSON.stringify(new_values) : null,
      ip_address || null
    ]);
    return result;
  }
};

module.exports = auditRepository;