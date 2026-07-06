const db = require('../config/db');

const userRepository = {
  create: async (userData) => {
    const { username, email, password, role } = userData;
    const query = `INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)`;
    const [result] = await db.execute(query, [username, email, password, role || 'staff']);
    return result;
  },

  findByEmail: async (email) => {
    const query = `SELECT * FROM users WHERE email = ? AND deleted_at IS NULL`;
    const [rows] = await db.execute(query, [email]);
    return rows[0];
  },

  findByUsername: async (username) => {
    const query = `SELECT * FROM users WHERE username = ? AND deleted_at IS NULL`;
    const [rows] = await db.execute(query, [username]);
    return rows[0];
  },

  findById: async (id) => {
    // Select only safe fields (exclude the password)
    const query = `SELECT id, username, email, role, created_at FROM users WHERE id = ? AND deleted_at IS NULL`;
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }
};

module.exports = userRepository;