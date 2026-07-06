const db = require('../config/db');

const studentRepository = {
  // UPDATED: Added optional connection parameter to execute inside a transaction pool
  create: async (studentData, connection = null) => {
    const client = connection || db; // Use transaction connection or default pool
    const { roll_no, first_name, last_name, email, class_name, academic_session_id } = studentData;
    const query = `
      INSERT INTO students (roll_no, first_name, last_name, email, class_name, academic_session_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await client.execute(query, [roll_no, first_name, last_name, email, class_name, academic_session_id]);
    return result;
  },

  findByRollNo: async (roll_no) => {
    const query = `SELECT * FROM students WHERE roll_no = ? AND deleted_at IS NULL`;
    const [rows] = await db.execute(query, [roll_no]);
    return rows[0];
  },

  // UPDATED: Now isolates data based on academic_session_id
  findAll: async ({ search, class_name, academic_session_id, sortBy, sortOrder, limit, offset }) => {
    let query = `SELECT * FROM students WHERE deleted_at IS NULL`;
    const queryParams = [];

    if (academic_session_id) {
      query += ` AND academic_session_id = ?`;
      queryParams.push(academic_session_id);
    }

    if (search) {
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR roll_no LIKE ?)`;
      const searchWildcard = `%${search}%`;
      queryParams.push(searchWildcard, searchWildcard, searchWildcard);
    }

    if (class_name) {
      query += ` AND class_name = ?`;
      queryParams.push(class_name);
    }

    query += ` ORDER BY ${sortBy} ${sortOrder}`;
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [rows] = await db.execute(query, queryParams);
    return rows;
  },

  // UPDATED: Now respects academic_session_id
  countAll: async ({ search, class_name, academic_session_id }) => {
    let query = `SELECT COUNT(*) as total FROM students WHERE deleted_at IS NULL`;
    const queryParams = [];

    if (academic_session_id) {
      query += ` AND academic_session_id = ?`;
      queryParams.push(academic_session_id);
    }

    if (search) {
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR roll_no LIKE ?)`;
      const searchWildcard = `%${search}%`;
      queryParams.push(searchWildcard, searchWildcard, searchWildcard);
    }

    if (class_name) {
      query += ` AND class_name = ?`;
      queryParams.push(class_name);
    }

    const [rows] = await db.execute(query, queryParams);
    return rows[0].total;
  },

  findById: async (id) => {
    const query = `SELECT * FROM students WHERE id = ? AND deleted_at IS NULL`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  },

  update: async (id, studentData) => {
    const { roll_no, first_name, last_name, email, class_name } = studentData;
    const query = `
      UPDATE students 
      SET roll_no = ?, first_name = ?, last_name = ?, email = ?, class_name = ? 
      WHERE id = ? AND deleted_at IS NULL
    `;
    const [result] = await db.execute(query, [roll_no, first_name, last_name, email, class_name, id]);
    return result;
  },

  softDelete: async (id) => {
    const query = `UPDATE students SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL`;
    const [result] = await db.execute(query, [id]);
    return result;
  }, // 🔴 Yahan comma lagaya hay

  // NEW: Update student profile picture field (Ab yeh object ke andar hay)
  updateProfilePicture: async (id, fileName) => {
    const query = `UPDATE students SET profile_picture = ? WHERE id = ? AND deleted_at IS NULL`;
    const [result] = await db.execute(query, [fileName, id]);
    return result;
  }
}; // 🔴 Object yahan band ho raha hay

module.exports = studentRepository; // 🔴 Export ab aakhir mein hay
