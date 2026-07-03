const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

// Register user baru
function register(req, res) {
  const { nama, email, password } = req.body;

  if (!nama || !email || !password)
    return res.status(400).json({ error: 'Semua field wajib diisi' });

  if (password.length < 6)
    return res.status(400).json({ error: 'Password minimal 6 karakter' });

  const sudahAda = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (sudahAda)
    return res.status(400).json({ error: 'Email sudah terdaftar' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (nama, email, password) VALUES (?, ?, ?)'
  ).run(nama, email, hash);

  const token = jwt.sign(
    { id: result.lastInsertRowid, nama, email, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ message: 'Registrasi berhasil', token, nama, role: 'user', id: result.lastInsertRowid });
}

// Login
function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email dan password wajib diisi' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user)
    return res.status(400).json({ error: 'Email tidak ditemukan' });

  if (user.banned) {
    return res.status(403).json({ error: 'Akun Anda diblokir. Hubungi admin.' });
  }

  const cocok = bcrypt.compareSync(password, user.password);
  if (!cocok)
    return res.status(400).json({ error: 'Password salah' });

  const token = jwt.sign(
    { id: user.id, nama: user.nama, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ message: 'Login berhasil', token, nama: user.nama, role: user.role, id: user.id });
}

// Ambil profil user yang sedang login
function profil(req, res) {
  const user = db.prepare(
    'SELECT id, nama, email, role, foto_profil, created_at FROM users WHERE id = ?'
  ).get(req.user.id);
  res.json(user);
}

module.exports = { register, login, profil };