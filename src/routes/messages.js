const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
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

const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Hanya file gambar yang diizinkan'));
  }
});

router.get('/daftar', authUser, getDaftarChat);
router.get('/threads', authUser, getDaftarChatThreads);
router.get('/thread/:chatId', authUser, getRiwayatChatByThread);
router.get('/users', authUser, getDaftarUser);
router.get('/:lawanId', authUser, getRiwayatChat);
router.post('/upload', authUser, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Gagal mengunggah gambar' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Gambar tidak ditemukan' });
    }

    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  });
});
router.post('/', authUser, kirimPesan);

module.exports = router;