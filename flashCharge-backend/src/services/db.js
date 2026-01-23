require('dotenv').config();
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  user: process.env.DB_USER || "steve",
  password: process.env.DB_PASSWORD || "steve",
  database: process.env.DB_NAME || "steve",
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
});

module.exports = pool;

