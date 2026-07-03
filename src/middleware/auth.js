const jwt = require('jsonwebtoken');

// Cek apakah user sudah login
function authUser(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Belum login' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token tidak valid' });
  }
}

// Cek apakah user adalah admin
function authAdmin(req, res, next) {
  authUser(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Akses ditolak' });
    }
    next();
  });
}

const isAuthenticated = authUser;

module.exports = { authUser, authAdmin, isAuthenticated };