const db = require('../database');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Ambil profil user + statistik postingannya
function getProfile(req, res) {
  try {
    const userId = req.user.id;

    // Ambil data user
    const user = db.prepare('SELECT id, nama, email, role, foto_profil, created_at FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Hitung statistik postingan
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold
      FROM posts WHERE user_id = ?
    `).get(userId);

    const wishlistCount = db.prepare('SELECT COUNT(*) as total FROM wishlists WHERE user_id = ?').get(userId).total;
    const reviewsCount = db.prepare('SELECT COUNT(*) as total FROM ratings WHERE penjual_id = ?').get(userId).total;

    // Ambil semua postingan user
    const posts = db.prepare(`
      SELECT id, judul, deskripsi, harga, kategori, foto, status, created_at
      FROM posts WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    res.json({
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        foto_profil: user.foto_profil,
        created_at: user.created_at
      },
      stats: {
        total_posts: stats.total_posts || 0,
        approved: stats.approved || 0,
        sold: stats.sold || 0,
        wishlist: wishlistCount || 0,
        reviews: reviewsCount || 0
      },
      posts: posts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getProfileById(req, res) {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!userId) return res.status(400).json({ error: 'ID user tidak valid' });

    const user = db.prepare('SELECT id, nama, email, role, foto_profil, created_at FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold
      FROM posts WHERE user_id = ?
    `).get(userId);

    const wishlistCount = db.prepare('SELECT COUNT(*) as total FROM wishlists WHERE user_id = ?').get(userId).total;
    const reviewsCount = db.prepare('SELECT COUNT(*) as total FROM ratings WHERE penjual_id = ?').get(userId).total;

    const posts = db.prepare(`
      SELECT id, judul, deskripsi, harga, kategori, foto, status, created_at
      FROM posts WHERE user_id = ? AND status = 'approved'
      ORDER BY created_at DESC
    `).all(userId);

    res.json({
      user: {
        id: user.id,
        nama: user.nama,
        email: user.email,
        role: user.role,
        foto_profil: user.foto_profil,
        created_at: user.created_at
      },
      stats: {
        total_posts: stats.total_posts || 0,
        approved: stats.approved || 0,
        sold: stats.sold || 0,
        wishlist: wishlistCount || 0,
        reviews: reviewsCount || 0
      },
      posts: posts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Edit profil user
function editProfile(req, res) {
  try {
    const userId = req.user.id;
    const { nama, currentPassword, newPassword } = req.body;

    // Validasi input
    if (!nama && !newPassword && !req.file)
      return res.status(400).json({ error: 'Minimal ada satu perubahan yang diisi' });

    if (newPassword && newPassword.length < 6)
      return res.status(400).json({ error: 'Password baru minimal 6 karakter' });

    // Ambil user saat ini
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    // Jika ingin ganti password, harus verifikasi password lama
    if (newPassword) {
      if (!currentPassword)
        return res.status(400).json({ error: 'Password lama wajib diisi untuk mengubah password' });

      const passwordCocok = bcrypt.compareSync(currentPassword, user.password);
      if (!passwordCocok)
        return res.status(400).json({ error: 'Password lama tidak sesuai' });
    }

    // Prepare update data
    let updates = [];
    let values = [];

    if (nama) {
      updates.push('nama = ?');
      values.push(nama);
    }

    if (newPassword) {
      const hash = bcrypt.hashSync(newPassword, 10);
      updates.push('password = ?');
      values.push(hash);
    }

    // Handle upload foto profil
    let fotoPath = user.foto_profil;
    if (req.file) {
      // Hapus foto lama jika ada
      if (user.foto_profil) {
        const oldPath = path.join(__dirname, '../../public', user.foto_profil);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      fotoPath = `/uploads/${req.file.filename}`;
      updates.push('foto_profil = ?');
      values.push(fotoPath);
    }

    // Jika ada perubahan, update database
    if (updates.length > 0) {
      values.push(userId);
      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values);
    }

    res.json({
      message: 'Profil berhasil diperbarui',
      user: {
        id: user.id,
        nama: nama || user.nama,
        email: user.email,
        role: user.role,
        foto_profil: fotoPath,
        created_at: user.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getProfile, getProfileById, editProfile };
