const db = require('../database');

// Ambil notifikasi user yang login
function getNotifikasi(req, res) {
  const notifs = db.prepare(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
  `).all(req.user.id);
  res.json(notifs);
}

// Tandai notifikasi sebagai dibaca
function tandaiDibaca(req, res) {
  const { id } = req.params;
  db.prepare(`UPDATE notifications SET dibaca = 1 WHERE id = ? AND user_id = ?`)
    .run(id, req.user.id);
  res.json({ message: 'Notifikasi telah dibaca' });
}

// Tandai semua notifikasi sebagai dibaca
function tandaiSemuaDibaca(req, res) {
  db.prepare(`UPDATE notifications SET dibaca = 1 WHERE user_id = ?`)
    .run(req.user.id);
  res.json({ message: 'Semua notifikasi telah dibaca' });
}

// Hitung notifikasi yang belum dibaca
function hitungBelumDibaca(req, res) {
  const result = db.prepare(`
    SELECT COUNT(*) as total FROM notifications
    WHERE user_id = ? AND dibaca = 0
  `).get(req.user.id);
  res.json({ belum_dibaca: result.total });
}

module.exports = { getNotifikasi, tandaiDibaca, tandaiSemuaDibaca, hitungBelumDibaca };