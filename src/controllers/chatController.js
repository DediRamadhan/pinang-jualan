const db = require('../database');

// Buat atau ambil chat thread untuk post tertentu
function getOrCreateChatThread(req, res) {
  const { post_id, user2_id } = req.body;
  const user1_id = req.user.id;
  const numericPostId = parseInt(post_id, 10);
  const numericUser2Id = parseInt(user2_id, 10);

  console.log('CHAT THREAD CREATE', { post_id, user2_id, numericPostId, numericUser2Id, user1_id });

  if (!numericPostId || !numericUser2Id) {
    return res.status(400).json({ error: 'post_id dan user2_id harus diisi dan valid' });
  }

  if (numericUser2Id === user1_id) {
    return res.status(400).json({ error: 'Tidak dapat membuat chat dengan diri sendiri' });
  }

  // Jika sebelumnya user menyembunyikan percakapan berdasarkan `counterpart_id`,
  // hapus entri tersebut agar saat membuat chat baru dari postingan, lawan bicara
  // kembali muncul di daftar chat.
  try {
    db.prepare(`DELETE FROM chat_hidden WHERE user_id = ? AND counterpart_id = ?`).run(user1_id, numericUser2Id);
  } catch (e) {
    console.warn('Gagal membersihkan chat_hidden untuk counterpart_id:', e && e.message);
  }

  // Cek apakah sudah ada chat thread untuk post ini
  const existing = db.prepare(`
    SELECT * FROM chat_threads
    WHERE post_id = ? AND (
      (user1_id = ? AND user2_id = ?) OR
      (user1_id = ? AND user2_id = ?)
    ) AND status = 'active'
  `).get(numericPostId, user1_id, numericUser2Id, numericUser2Id, user1_id);

  if (existing) {
    return res.json(existing);
  }

  // Buat thread baru
  const result = db.prepare(`
    INSERT INTO chat_threads (user1_id, user2_id, post_id)
    VALUES (?, ?, ?)
  `).run(user1_id, user2_id, post_id);

  res.json({ id: result.lastInsertRowid, user1_id, user2_id, post_id, status: 'active' });
}

// Kirim negosiasi harga
function kirimNegosiasi(req, res) {
  const { chat_id, harga } = req.body;
  const user_id = req.user.id;

  if (!harga || harga <= 0)
    return res.status(400).json({ error: 'Harga tidak valid' });

  // Cek apakah sudah ada negosiasi pending
  const pending = db.prepare(`
    SELECT * FROM negotiations
    WHERE chat_id = ? AND status = 'pending'
  `).get(chat_id);

  if (pending)
    return res.status(400).json({ error: 'Masih ada negosiasi menunggu jawaban' });

  const result = db.prepare(`
    INSERT INTO negotiations (chat_id, penawaran_id, harga, dibuat_oleh)
    VALUES (?, ?, ?, ?)
  `).run(chat_id, user_id, harga, user_id);

  const nego = db.prepare(`
    SELECT n.*, u.nama FROM negotiations n
    JOIN users u ON n.dibuat_oleh = u.id
    WHERE n.id = ?
  `).get(result.lastInsertRowid);

  res.json(nego);
}

// Approve negosiasi
function approveNegosiasi(req, res) {
  const { nego_id } = req.body;
  const user_id = req.user.id;

  const nego = db.prepare('SELECT * FROM negotiations WHERE id = ?').get(nego_id);
  if (!nego) return res.status(404).json({ error: 'Negosiasi tidak ditemukan' });

  // Update chat dengan harga final
  db.prepare(`UPDATE chat_threads SET harga_akhir = ? WHERE id = ?`)
    .run(nego.harga, nego.chat_id);

  db.prepare(`UPDATE negotiations SET status = 'approved' WHERE id = ?`).run(nego_id);

  res.json({ message: 'Negosiasi disetujui', harga_akhir: nego.harga });
}

// Reject negosiasi
function rejectNegosiasi(req, res) {
  const { nego_id } = req.body;

  db.prepare(`UPDATE negotiations SET status = 'rejected' WHERE id = ?`).run(nego_id);
  res.json({ message: 'Negosiasi ditolak' });
}

// Ambil negosiasi aktif
function getNegotiasi(req, res) {
  const { chat_id } = req.params;
  const nego = db.prepare(`
    SELECT n.*, u.nama FROM negotiations n
    JOIN users u ON n.dibuat_oleh = u.id
    WHERE n.chat_id = ? AND n.status = 'pending'
  `).get(chat_id);
  res.json(nego || null);
}

// Tutup chat
function closeChat(req, res) {
  const { chat_id, status, metode_bayar } = req.body;
  const user_id = req.user.id;

  if (!['completed', 'not_interested'].includes(status))
    return res.status(400).json({ error: 'Status tidak valid' });

  db.prepare(`
    UPDATE chat_threads
    SET status = ?, metode_bayar = ?, closed_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(status, metode_bayar || null, chat_id);

  res.json({ message: 'Chat ditutup' });
}

// Invite admin ke chat
function inviteAdmin(req, res) {
  const chatId = parseInt(req.body.chat_id, 10);
  if (!chatId) return res.status(400).json({ error: 'chat_id tidak valid' });

  const chat = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(chatId);
  if (!chat) return res.status(404).json({ error: 'Chat tidak ditemukan' });

  if (![chat.user1_id, chat.user2_id].includes(req.user.id)) {
    return res.status(403).json({ error: 'Hanya peserta chat yang dapat mengundang admin' });
  }

  if (chat.admin_id) {
    const admin = db.prepare('SELECT id, nama FROM users WHERE id = ?').get(chat.admin_id);
    return res.json({ message: 'Admin sudah bergabung', admin_id: admin.id, admin_name: admin.nama, chat_id: chatId });
  }

  const admin = db.prepare('SELECT id, nama FROM users WHERE role = ? LIMIT 1').get('admin');
  if (!admin) return res.status(404).json({ error: 'Admin tidak ditemukan' });

  db.prepare('UPDATE chat_threads SET admin_id = ? WHERE id = ?').run(admin.id, chatId);

  const systemMessageReceiver = chat.user1_id;
  db.prepare(`INSERT INTO messages (sender_id, receiver_id, chat_id, isi) VALUES (?, ?, ?, ?)`)
    .run(admin.id, systemMessageReceiver, chatId, 'Admin telah diundang sebagai rekber ke dalam percakapan ini.');

  db.prepare(`INSERT INTO notifications (user_id, pesan) VALUES (?, ?)`)
    .run(admin.id, `Anda diundang sebagai admin rekber dalam chat #${chatId}`);
  db.prepare(`INSERT INTO notifications (user_id, pesan) VALUES (?, ?)`)
    .run(chat.user1_id, `Admin telah bergabung dalam chat Anda`);
  if (chat.user2_id !== chat.user1_id) {
    db.prepare(`INSERT INTO notifications (user_id, pesan) VALUES (?, ?)`)
      .run(chat.user2_id, `Admin telah bergabung dalam chat Anda`);
  }

  const io = req.app.get('io');
  if (io) {
    const recipients = new Set([chat.user1_id, chat.user2_id, admin.id]);
    recipients.forEach((uid) => io.to(`user_${uid}`).emit('chat_admin_invited', {
      chat_id: chatId,
      admin_id: admin.id,
      admin_name: admin.nama
    }));
  }

  res.json({ message: 'Admin diundang ke chat', admin_id: admin.id, admin_name: admin.nama, chat_id: chatId });
}

// Ambil chat threads untuk admin
function getChatThreadsForAdmin(req, res) {
  const adminId = req.user.id;
  const threads = db.prepare(`
    SELECT ct.*, 
      u1.nama as user1_nama, u1.id as user1_id,
      u2.nama as user2_nama, u2.id as user2_id,
      (SELECT isi FROM messages WHERE (sender_id = ct.user1_id AND receiver_id = ct.user2_id) OR (sender_id = ct.user2_id AND receiver_id = ct.user1_id) ORDER BY created_at DESC LIMIT 1) as pesan_terakhir
    FROM chat_threads ct
    JOIN users u1 ON ct.user1_id = u1.id
    JOIN users u2 ON ct.user2_id = u2.id
    WHERE ct.admin_id = ?
    ORDER BY ct.created_at DESC
  `).all(adminId);
  
  res.json(threads || []);
}

// Kirim rating
function kirimRating(req, res) {
  const { chat_id, rating, review } = req.body;
  const pembeli_id = req.user.id;

  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ error: 'Rating harus 1-5' });

  const chat = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(chat_id);
  if (!chat) return res.status(404).json({ error: 'Chat tidak ditemukan' });

  // Tentukan siapa yang memberikan rating dan siapa yang menerima
  const penjual_id = pembeli_id === chat.user1_id ? chat.user2_id : chat.user1_id;

  // Cek apakah sudah ada rating
  const existing = db.prepare(`
    SELECT * FROM ratings WHERE chat_id = ? AND pembeli_id = ?
  `).get(chat_id, pembeli_id);

  if (existing)
    return res.status(400).json({ error: 'Anda sudah memberikan rating' });

  db.prepare(`
    INSERT INTO ratings (chat_id, pembeli_id, penjual_id, rating, review)
    VALUES (?, ?, ?, ?, ?)
  `).run(chat_id, pembeli_id, penjual_id, rating, review || null);

  // Update rating rata-rata penjual
  const stats = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as total
    FROM ratings WHERE penjual_id = ?
  `).get(penjual_id);

  db.prepare(`UPDATE users SET rating = ?, total_rating = ? WHERE id = ?`)
    .run(stats.avg_rating || 0, stats.total || 0, penjual_id);

  res.json({ message: 'Rating berhasil diberikan' });
}

// Ambil info chat (termasuk rating jika ada)
function getChatInfo(req, res) {
  const { chat_id } = req.params;

  const chat = db.prepare(`
    SELECT ct.*, p.harga as harga_original, p.judul as post_judul, u_admin.nama as admin_name
    FROM chat_threads ct
    LEFT JOIN posts p ON ct.post_id = p.id
    LEFT JOIN users u_admin ON ct.admin_id = u_admin.id
    WHERE ct.id = ?
  `).get(chat_id);

  const rating = db.prepare(`
    SELECT * FROM ratings WHERE chat_id = ?
  `).get(chat_id);

  res.json({ chat, rating });
}

module.exports = {
  getOrCreateChatThread, kirimNegosiasi, approveNegosiasi, rejectNegosiasi,
  getNegotiasi, closeChat, inviteAdmin, kirimRating, getChatInfo, getChatThreadsForAdmin
};

// Cari thread antara dua user (terbaru)
function getThreadBetweenUsers(req, res) {
  const a = parseInt(req.params.userA, 10);
  const b = parseInt(req.params.userB, 10);
  if (!a || !b) return res.status(400).json({ error: 'Parameter user tidak valid' });

  const thread = db.prepare(`
    SELECT * FROM chat_threads
    WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
    ORDER BY created_at DESC LIMIT 1
  `).get(a, b, b, a);

  res.json(thread || null);
}

module.exports.getThreadBetweenUsers = getThreadBetweenUsers;