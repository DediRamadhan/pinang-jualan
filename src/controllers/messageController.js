const db = require('../database');

function findActiveChatThread(userId, otherId) {
  return db.prepare(`
    SELECT * FROM chat_threads
    WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(userId, otherId, otherId, userId);
}

function getDaftarChat(req, res) {
  const userId = req.user.id;

  try {
    const daftar = db.prepare(`
      SELECT u.id, u.nama, u.role,
             CASE WHEN m.attachment_type = 'image' THEN '[Gambar]' ELSE m.isi END as pesan_terakhir,
             m.created_at,
             COALESCE((SELECT COUNT(*) FROM messages 
                       WHERE receiver_id = ? AND sender_id = u.id AND dibaca = 0), 0) as belum_dibaca
      FROM users u
      JOIN messages m ON (
        (m.sender_id = u.id AND m.receiver_id = ?) OR
        (m.sender_id = ? AND m.receiver_id = u.id)
      )
      WHERE u.id != ? 
      AND m.created_at = (
        SELECT MAX(m2.created_at) FROM messages m2 
        WHERE (m2.sender_id = u.id AND m2.receiver_id = ?) OR (m2.sender_id = ? AND m2.receiver_id = u.id)
      )
      
      UNION ALL
      
      SELECT u.id, u.nama, u.role,
             '[Chat dimulai]' as pesan_terakhir,
             ct.created_at,
             0 as belum_dibaca
      FROM users u
      JOIN chat_threads ct ON (
        (ct.user1_id = u.id AND ct.user2_id = ?) OR
        (ct.user1_id = ? AND ct.user2_id = u.id)
      )
      WHERE u.id != ? AND NOT EXISTS (
        SELECT 1 FROM messages m 
        WHERE (m.sender_id = u.id AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = u.id)
      )
      
      ORDER BY created_at DESC
    `).all(
      userId,                    // count belum_dibaca
      userId, userId, userId,    // messages join
      userId, userId,            // max created_at
      userId, userId, userId,    // chat_threads join
      userId, userId             // NOT EXISTS check
    );
    
    const seen = new Set();
    const unique = daftar.filter(d => {
      if (seen.has(d.id)) return false;
      seen.add(d.id);
      return true;
    });
    
    console.log('getDaftarChat result:', unique);
    res.json(unique);
  } catch (err) {
    console.error('Error getDaftarChat:', err);
    res.status(500).json({ error: err.message });
  }
}

function getDaftarChatThreads(req, res) {
  const userId = req.user.id;

  try {
    const threads = db.prepare(`
      SELECT
        ct.id as chat_id,
        CASE WHEN ct.user1_id = ? THEN u2.id ELSE u1.id END as counterpart_id,
        CASE WHEN ct.user1_id = ? THEN u2.nama ELSE u1.nama END as counterpart_nama,
        CASE WHEN ct.user1_id = ? THEN u2.role ELSE u1.role END as counterpart_role,
        COALESCE((SELECT CASE WHEN m.attachment_type = 'image' THEN '[Gambar]' ELSE m.isi END FROM messages m WHERE m.chat_id = ct.id ORDER BY m.created_at DESC LIMIT 1), '[Chat dimulai]') as pesan_terakhir,
        COALESCE((SELECT COUNT(*) FROM messages m WHERE m.chat_id = ct.id AND m.receiver_id = ? AND m.dibaca = 0), 0) as belum_dibaca,
        COALESCE((SELECT MAX(m.created_at) FROM messages m WHERE m.chat_id = ct.id), ct.created_at) as last_activity,
        ct.status,
        ct.post_id,
        ct.admin_id,
        ct.harga_akhir
      FROM chat_threads ct
      JOIN users u1 ON ct.user1_id = u1.id
      JOIN users u2 ON ct.user2_id = u2.id
      WHERE ct.user1_id = ? OR ct.user2_id = ?
      ORDER BY last_activity DESC
    `).all(userId, userId, userId, userId, userId, userId);

    const unique = [];
    const seen = new Set();
    for (const thread of threads) {
      if (!seen.has(thread.counterpart_id)) {
        seen.add(thread.counterpart_id);
        unique.push(thread);
      }
    }

    res.json(unique);
  } catch (err) {
    console.error('Error getDaftarChatThreads:', err);
    res.status(500).json({ error: err.message });
  }
}

function getRiwayatChat(req, res) {
  const userId = req.user.id;
  const lawanId = parseInt(req.params.lawanId, 10);

  db.prepare(`
    UPDATE messages SET dibaca = 1
    WHERE receiver_id = ? AND sender_id = ?
  `).run(userId, lawanId);

  const pesan = db.prepare(`
    SELECT m.*, u.nama as nama_sender
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE (m.sender_id = ? AND m.receiver_id = ?)
       OR (m.sender_id = ? AND m.receiver_id = ?)
    ORDER BY m.created_at ASC
  `).all(userId, lawanId, lawanId, userId);

  res.json(pesan);
}

function getRiwayatChatByThread(req, res) {
  const userId = req.user.id;
  const chatId = parseInt(req.params.chatId, 10);

  const thread = db.prepare(`
    SELECT * FROM chat_threads
    WHERE id = ? AND (user1_id = ? OR user2_id = ? OR admin_id = ?)
  `).get(chatId, userId, userId, userId);

  if (!thread) {
    return res.status(404).json({ error: 'Chat tidak ditemukan' });
  }

  db.prepare(`
    UPDATE messages SET dibaca = 1
    WHERE chat_id = ? AND receiver_id = ?
  `).run(chatId, userId);

  const pesan = db.prepare(`
    SELECT m.*, u.nama as nama_sender
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.chat_id = ?
       OR (m.chat_id IS NULL AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)))
    ORDER BY m.created_at ASC
  `).all(chatId, thread.user1_id, thread.user2_id, thread.user2_id, thread.user1_id);

  res.json(pesan);
}

function kirimPesan(req, res) {
  const { receiver_id, isi, chat_id, attachment_url, attachment_type } = req.body;
  const sender_id = req.user.id;
  let chosenChatId = chat_id ? parseInt(chat_id, 10) : null;
  let actualReceiverId = receiver_id ? parseInt(receiver_id, 10) : null;
  const pesanTeks = (isi || '').trim();
  const adaLampiran = Boolean(attachment_url);

  if (!pesanTeks && !adaLampiran) {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  }

  if (!chosenChatId && !actualReceiverId)
    return res.status(400).json({ error: 'Penerima tidak valid' });

  if (chosenChatId) {
    const thread = db.prepare(`
      SELECT * FROM chat_threads
      WHERE id = ? AND (user1_id = ? OR user2_id = ? OR admin_id = ?)
    `).get(chosenChatId, sender_id, sender_id, sender_id);

    if (!thread) {
      return res.status(400).json({ error: 'Chat thread tidak valid' });
    }

    if (!actualReceiverId) {
      if (thread.user1_id === sender_id) actualReceiverId = thread.user2_id;
      else if (thread.user2_id === sender_id) actualReceiverId = thread.user1_id;
      else if (thread.admin_id === sender_id) actualReceiverId = thread.user1_id;
      else actualReceiverId = thread.user2_id;
    } else if (![thread.user1_id, thread.user2_id].includes(actualReceiverId) && actualReceiverId !== thread.admin_id) {
      return res.status(400).json({ error: 'Penerima tidak terhubung di chat thread ini' });
    }
  }

  if (!chosenChatId && actualReceiverId) {
    // If there exists any thread between these users that is NOT active, block sending
    const anyThread = db.prepare(`
      SELECT * FROM chat_threads
      WHERE ((user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?))
      ORDER BY created_at DESC LIMIT 1
    `).get(sender_id, actualReceiverId, actualReceiverId, sender_id);

    if (anyThread && anyThread.status && anyThread.status !== 'active') {
      return res.status(400).json({ error: 'Chat telah ditutup dan tidak dapat mengirim pesan.' });
    }

    const existingThread = findActiveChatThread(sender_id, actualReceiverId);
    if (existingThread) {
      chosenChatId = existingThread.id;
    }
  }

  const result = db.prepare(`
    INSERT INTO messages (sender_id, receiver_id, chat_id, isi, attachment_type, attachment_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sender_id, actualReceiverId, chosenChatId, pesanTeks, attachment_type || null, attachment_url || null);

  const pesan = db.prepare(`
    SELECT m.*, u.nama as nama_sender
    FROM messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.id = ?
  `).get(result.lastInsertRowid);

  const io = req.app.get('io');
  if (io && chosenChatId) {
    const thread = db.prepare('SELECT * FROM chat_threads WHERE id = ?').get(chosenChatId);
    if (thread) {
      const recipients = new Set([thread.user1_id, thread.user2_id]);
      if (thread.admin_id) recipients.add(thread.admin_id);
      recipients.delete(sender_id);
      recipients.forEach((uid) => {
        io.to(`user_${uid}`).emit('new_message', pesan);
      });
    }
  } else if (io && actualReceiverId) {
    io.to(`user_${actualReceiverId}`).emit('new_message', pesan);
  }

  res.json(pesan);
}

function getDaftarUser(req, res) {
  const users = db.prepare(`
    SELECT id, nama, role FROM users
    WHERE id != ?
    ORDER BY role DESC, nama ASC
  `).all(req.user.id);
  res.json(users);
}

module.exports = {
  getDaftarChat,
  getDaftarChatThreads,
  getRiwayatChat,
  getRiwayatChatByThread,
  kirimPesan,
  getDaftarUser
};