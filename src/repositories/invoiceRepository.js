const db = require('../config/db');

const invoiceRepository = {
  // Accepts an optional connection parameter for transactions
  create: async (invoiceData, connection = null) => {
    const client = connection || db; // Use transaction connection or default database pool
    const { student_id, amount, due_date } = invoiceData;
    const query = `
      INSERT INTO fee_invoices (student_id, amount, due_date) 
      VALUES (?, ?, ?)
    `;
    const [result] = await client.execute(query, [student_id, amount, due_date]);
    return result;
  }
};

module.exports = invoiceRepository;