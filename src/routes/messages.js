const express = require('express');
const router = express.Router();
const { authUser } = require('../middleware/auth');
const {
  getDaftarChat,
  getDaftarChatThreads,
  getRiwayatChat,
  getRiwayatChatByThread,
  kirimPesan,
  getDaftarUser
} = require('../controllers/messageController');

router.get('/daftar', authUser, getDaftarChat);
router.get('/threads', authUser, getDaftarChatThreads);
router.get('/thread/:chatId', authUser, getRiwayatChatByThread);
router.get('/users', authUser, getDaftarUser);
router.get('/:lawanId', authUser, getRiwayatChat);
router.post('/', authUser, kirimPesan);

module.exports = router;