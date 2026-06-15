// Database config
const DB = {
  host:     process.env.DB_HOST || 'localhost',
  port:     process.env.DB_PORT || 3306,
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'L@LAIHULH1234@',
  database: process.env.DB_NAME || 'fuliya',
  charset:  'utf8mb4'
};

// JWT
const JWT_SECRET  = process.env.JWT_SECRET || 'fuliya_jwt_secret_2026';
const JWT_EXPIRES = '24h';

// Upload
const UPLOAD_DIR  = process.env.UPLOAD_DIR || '../static/uploads';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

// Site
const PORT = process.env.PORT || 3000;
const ADMIN_ROUTE = '/admin';

module.exports = { DB, JWT_SECRET, JWT_EXPIRES, UPLOAD_DIR, MAX_FILE_SIZE, PORT, ADMIN_ROUTE };
