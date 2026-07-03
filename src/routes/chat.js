const express = require('express');
const router = express.Router();
const { authUser, authAdmin } = require('../middleware/auth');
const {
  getOrCreateChatThread, kirimNegosiasi, approveNegosiasi, rejectNegosiasi,
  getNegotiasi, closeChat, inviteAdmin, kirimRating, getChatInfo
} = require('../controllers/chatController');

router.post('/thread', authUser, getOrCreateChatThread);
router.post('/negotiation', authUser, kirimNegosiasi);
router.put('/negotiation/:nego_id/approve', authUser, approveNegosiasi);
router.put('/negotiation/:nego_id/reject', authUser, rejectNegosiasi);
router.get('/negotiation/:chat_id', authUser, getNegotiasi);
router.put('/close', authUser, closeChat);
router.post('/invite-admin', authUser, inviteAdmin);
router.post('/rating', authUser, kirimRating);
router.get('/:chat_id/info', authUser, getChatInfo);

// Admin threads
router.get('/admin/threads', authAdmin, async (req, res) => {
  const db = require('../database');
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
});

module.exports = router;