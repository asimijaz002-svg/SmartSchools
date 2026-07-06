const auditRepository = require('../repositories/auditRepository');

const auditService = {
  log: async ({ user_id, action, entity_name, entity_id, previous_values, new_values, ip_address }) => {
    try {
      await auditRepository.create({
        user_id,
        action,
        entity_name,
        entity_id,
        previous_values,
        new_values,
        ip_address
      });
    } catch (error) {
      // Fail-safe check: Do not crash main user flows if audit database log write fails
      console.error('⚠️ [AUDIT SYSTEM ERROR]: Failed to persist audit log:', error.message);
    }
  }
};

module.exports = auditService;