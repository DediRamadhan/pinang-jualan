const db = require('../database');
const path = require('path');
const fs = require('fs');
const { buildPostListQuery } = require('../utils/postQuery');

// Ambil semua postingan yang sudah approved (untuk halaman home)
function getAllPosts(req, res) {
  const { search, kategori, sort, harga_min, harga_max } = req.query;
  const { query, params } = buildPostListQuery({ search, kategori, sort, harga_min, harga_max });
  const posts = db.prepare(query).all(...params);

  if (req.user) {
    const wishlisted = new Set(
      db.prepare('SELECT post_id FROM wishlists WHERE user_id = ?').all(req.user.id).map(item => item.post_id)
    );
    const enriched = posts.map(post => ({ ...post, is_wishlist: wishlisted.has(post.id) }));
    return res.json(enriched);
  }

  res.json(posts.map(post => ({ ...post, is_wishlist: false })));
}

// Ambil postingan milik user yang login
function getMyPosts(req, res) {
  const posts = db.prepare(`
    SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(posts);
}

// Detail satu postingan
function getPostById(req, res) {
  const post = db.prepare(`
    SELECT posts.*, users.nama as nama_penjual, users.id as penjual_id
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.id = ?
  `).get(req.params.id);

  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  const isWishlist = req.user
    ? !!db.prepare('SELECT 1 FROM wishlists WHERE user_id = ? AND post_id = ?').get(req.user.id, post.id)
    : false;

  res.json({ ...post, is_wishlist: isWishlist });
}

// Upload postingan baru
function createPost(req, res) {
  const { judul, deskripsi, harga, kategori } = req.body;

  if (!judul || !deskripsi || !harga || !kategori)
    return res.status(400).json({ error: 'Semua field wajib diisi' });

  const foto = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare(`
    INSERT INTO posts (user_id, judul, deskripsi, harga, kategori, foto, status)
    VALUES (?, ?, ?, ?, ?, ?, 'pending')
  `).run(req.user.id, judul, deskripsi, parseInt(harga), kategori, foto);

  // Kirim notifikasi ke admin
  const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all();
  admins.forEach(admin => {
    db.prepare(`
      INSERT INTO notifications (user_id, pesan)
      VALUES (?, ?)
    `).run(admin.id, `Postingan baru menunggu review: "${judul}"`);
  });

  res.json({ message: 'Postingan berhasil dikirim, menunggu persetujuan admin', id: result.lastInsertRowid });
}

// Hapus postingan (hanya milik sendiri)
function deletePost(req, res) {
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id);

  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  // Hapus foto kalau ada
  if (post.foto) {
    const fotoPath = path.join(__dirname, '../../public', post.foto);
    if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
  }

  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Postingan berhasil dihapus' });
}

function getWishlist(req, res) {
  const posts = db.prepare(`
    SELECT p.*, u.nama as nama_penjual, u.id as penjual_id
    FROM wishlists w
    JOIN posts p ON w.post_id = p.id
    JOIN users u ON p.user_id = u.id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC
  `).all(req.user.id);

  res.json(posts);
}

function toggleWishlist(req, res) {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM wishlists WHERE user_id = ? AND post_id = ?').get(req.user.id, id);

  if (existing) {
    db.prepare('DELETE FROM wishlists WHERE id = ?').run(existing.id);
    return res.json({ message: 'Dihapus dari wishlist', added: false });
  }

  db.prepare('INSERT INTO wishlists (user_id, post_id) VALUES (?, ?)').run(req.user.id, id);
  res.json({ message: 'Ditambahkan ke wishlist', added: true });
}

function markPostAsSold(req, res) {
  const { id } = req.params;
  const post = db.prepare('SELECT * FROM posts WHERE id = ? AND user_id = ?').get(id, req.user.id);

  if (!post) return res.status(404).json({ error: 'Postingan tidak ditemukan' });

  db.prepare("UPDATE posts SET status = 'sold' WHERE id = ?").run(id);
  res.json({ message: 'Status postingan diubah menjadi terjual' });
}

module.exports = {
  getAllPosts,
  getMyPosts,
  getPostById,
  createPost,
  deletePost,
  getWishlist,
  toggleWishlist,
  markPostAsSold
};