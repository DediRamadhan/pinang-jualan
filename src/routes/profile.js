const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authUser } = require('../middleware/auth');
const { getProfile, getProfileById, editProfile } = require('../controllers/profileController');

// Setup upload foto profil
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const unik = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unik + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase());
    ok ? cb(null, true) : cb(new Error('Hanya file gambar yang diizinkan'));
  }
});

// Routes
router.get('/', authUser, getProfile);
router.get('/:id', authUser, getProfileById);
router.post('/edit', authUser, upload.single('foto_profil'), editProfile);

module.exports = router;
