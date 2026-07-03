const express = require('express');
const router = express.Router();
const { authUser } = require('../middleware/auth');
const {
  getNotifikasi, tandaiDibaca, tandaiSemuaDibaca, hitungBelumDibaca
} = require('../controllers/notificationController');

router.get('/', authUser, getNotifikasi);
router.get('/hitung/belum-dibaca', authUser, hitungBelumDibaca);
router.put('/:id/baca', authUser, tandaiDibaca);
router.put('/baca/semua', authUser, tandaiSemuaDibaca);

module.exports = router;