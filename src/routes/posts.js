const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authUser } = require('../middleware/auth');
const {
  getAllPosts, getMyPosts, getPostById, createPost, updatePost, deletePost, getWishlist, toggleWishlist, markPostAsSold
} = require('../controllers/postController');

// Setup upload foto
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

router.get('/', authUser, getAllPosts);
router.get('/saya', authUser, getMyPosts);
router.get('/wishlist', authUser, getWishlist);
router.get('/:id', getPostById);
router.post('/', authUser, upload.array('fotos', 5), createPost);
router.put('/:id', authUser, upload.array('fotos', 5), updatePost);
router.post('/:id/wishlist', authUser, toggleWishlist);
router.post('/:id/sold', authUser, markPostAsSold);
router.delete('/:id', authUser, deletePost);

module.exports = router;