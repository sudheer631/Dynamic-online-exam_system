/**
 * db.js – MySQL connection pool
 * Uses mysql2/promise for async/await support.
 */
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'exam_system',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00'
});

pool.getConnection()
  .then(conn => { console.log('✅  MySQL connected'); conn.release(); })
  .catch(err => { console.error('❌  MySQL connection failed:', err.message); process.exit(1); });

module.exports = pool;
