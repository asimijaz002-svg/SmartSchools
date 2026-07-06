const mysql = require('mysql2/promise'); // Modern async/await support ke liye
require('dotenv').config();

// Connection Pool banana (Jo ek sath bohot se users ko handle karta hai)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'school_erp_db',
  waitForConnections: true,
  connectionLimit: 10, // Ek waqt mein maximum 10 active connections
  queueLimit: 0
});

// Database connection check karne ka function
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    connection.release(); // Connection check karne ke baad wapas pool mein bhej dein
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
};

// Test function ko run karein taake console mein result dikhe
testConnection();

module.exports = pool;