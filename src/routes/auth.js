const express = require('express');
const router = express.Router();
const { register, login, profil } = require('../controllers/authController');
const { authUser } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/profil', authUser, profil);

module.exports = router;