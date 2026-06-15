const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./config');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend/views'));

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/static', express.static(path.join(__dirname, '../static'), { maxAge: '7d', etag: true }));
app.use('/public', express.static(path.join(__dirname, '../frontend/public'), { maxAge: '7d' }));

// Routes
app.use('/api', require('./routes/api'));
app.use('/admin-api', require('./routes/admin'));

// Frontend pages
app.use('/', require('./routes/frontend'));

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).send('Server Error');
});

app.listen(PORT, () => {
  console.log(`🚀 Fuliya Server: http://localhost:${PORT}`);
});
