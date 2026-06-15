const moment = require('moment');

// Format time
function fmtTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  return moment(date).format(format);
}

// Pagination helper
function paginate(page = 1, pageSize = 20) {
  page = Math.max(1, parseInt(page) || 1);
  pageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

// API response
function success(data = null, msg = 'ok') {
  return { code: 0, msg, data };
}

function fail(msg = 'error', code = -1) {
  return { code, msg, data: null };
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Slugify
function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

module.exports = { fmtTime, paginate, success, fail, escapeHtml, slugify };
