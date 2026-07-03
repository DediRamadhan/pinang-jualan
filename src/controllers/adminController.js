const db = require('../database');

// Ambil semua postingan (semua status)
function semuaPost(req, res) {
  const { status } = req.query;
  let query = `
    SELECT posts.*, users.nama as nama_penjual, users.email as email_penjual
    FROM posts
    JOIN users ON posts.user_id = users.id
  `;
  if (status && status !== 'semua') {
    query += ` WHERE posts.status = '${status}'`;
  }
  query += ` ORDER BY posts.pinned DESC, posts.created_at DESC`;
  const posts = db.prepare(query).all();
  res.json(posts);
}

// Approve postingan
function approvePost(req, res) {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  db.prepare(`UPDATE posts SET status = 'approved' WHERE id = ?`).run(req.params.id);

  // Notifikasi ke pemilik post
  db.prepare(`INSERT INTO notifications (user_id, pesan) VALUES (?, ?)`)
    .run(post.user_id, `✅ Postingan "${post.judul}" telah disetujui dan sekarang tampil di marketplace!`);

  res.json({ message: 'Postingan disetujui' });
}

// Reject postingan
function rejectPost(req, res) {
  const { alasan } = req.body;
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  db.prepare(`UPDATE posts SET status = 'rejected', alasan_reject = ? WHERE id = ?`)
    .run(alasan || 'Tidak memenuhi ketentuan', req.params.id);

  // Notifikasi ke pemilik post
  db.prepare(`INSERT INTO notifications (user_id, pesan) VALUES (?, ?)`)
    .run(post.user_id, `❌ Postingan "${post.judul}" ditolak. Alasan: ${alasan || 'Tidak memenuhi ketentuan'}`);

  res.json({ message: 'Postingan ditolak' });
}

// Hapus postingan (oleh admin)
function hapusPost(req, res) {
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Postingan dihapus' });
}

// Sematkan / lepaskan postingan
function togglePinPost(req, res) {
  const { pin } = req.body;
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  db.prepare('UPDATE posts SET pinned = ? WHERE id = ?').run(pin ? 1 : 0, req.params.id);
  res.json({ message: pin ? 'Postingan disematkan' : 'Postingan dilepas dari sematan', pinned: !!pin });
}

// Ambil semua user
function semuaUser(req, res) {
  const users = db.prepare(`
    SELECT id, nama, email, role, banned, created_at FROM users ORDER BY created_at DESC
  `).all();
  res.json(users);
}

// Ban atau unban user
function banUser(req, res) {
  const userId = parseInt(req.params.id, 10);
  if (req.user.id === userId) {
    return res.status(400).json({ error: 'Admin tidak dapat memblokir diri sendiri' });
  }

  const user = db.prepare('SELECT id, banned FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

  const nextStatus = user.banned ? 0 : 1;
  db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(nextStatus, userId);
  res.json({ message: user.banned ? 'User diizinkan kembali' : 'User diblokir', banned: nextStatus });
}

// Hapus akun user beserta data terkait
function hapusUser(req, res) {
  const userId = parseInt(req.params.id, 10);
  if (req.user.id === userId) {
    return res.status(400).json({ error: 'Admin tidak dapat menghapus dirinya sendiri' });
  }

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

  db.prepare('DELETE FROM messages WHERE sender_id = ? OR receiver_id = ?').run(userId, userId);
  db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM chat_threads WHERE user1_id = ? OR user2_id = ? OR admin_id = ?').run(userId, userId, userId);
  db.prepare('DELETE FROM ratings WHERE pembeli_id = ? OR penjual_id = ?').run(userId, userId);
  db.prepare('DELETE FROM wishlists WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM posts WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  res.json({ message: 'User dan semua data terkait telah dihapus' });
}

// Statistik dashboard
function statistik(req, res) {
  const totalUser = db.prepare(`SELECT COUNT(*) as total FROM users WHERE role = 'user'`).get();
  const totalPost = db.prepare(`SELECT COUNT(*) as total FROM posts`).get();
  const pending = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE status = 'pending'`).get();
  const approved = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE status = 'approved'`).get();
  const rejected = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE status = 'rejected'`).get();

  res.json({
    totalUser: totalUser.total,
    totalPost: totalPost.total,
    pending: pending.total,
    approved: approved.total,
    rejected: rejected.total
  });
}

// Ambil notifikasi admin
function notifikasi(req, res) {
  const notifs = db.prepare(`
    SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20
  `).all(req.user.id);
  res.json(notifs);
}

module.exports = { semuaPost, approvePost, rejectPost, hapusPost, togglePinPost, semuaUser, banUser, hapusUser, statistik, notifikasi };