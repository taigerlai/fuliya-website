const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const { fail } = require('../utils');

// Verify admin token
function authAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json(fail('未登录', 401));
  }
  try {
    const token = auth.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json(fail('Token无效或已过期', 401));
  }
}

module.exports = { authAdmin };
