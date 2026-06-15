const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/static', express.static(path.join(__dirname, '../static'), {
  maxAge: '7d',
  etag: true
}));

// API routes
app.use('/api', require('./routes/api'));
app.use('/admin', require('./routes/admin'));

// Serve frontend (for production)
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/admin') && !req.path.startsWith('/static')) {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  res.status(500).json({ code: -1, msg: err.message || '服务器错误', data: null });
});

app.listen(PORT, () => {
  console.log(`🚀 Fuliya Server running on port ${PORT}`);
  console.log(`📦 API: http://localhost:${PORT}/api`);
  console.log(`🔧 Admin: http://localhost:${PORT}/admin`);
});
