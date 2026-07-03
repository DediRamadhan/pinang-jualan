require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

// Inisialisasi database (otomatis buat tabel & admin)
const db = require('./src/database');

// Simpan io agar bisa dipakai di controller
app.set('io', io);

// Socket.io — private chat real-time
io.on('connection', (socket) => {
  console.log('User terhubung:', socket.id);

  socket.on('join', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('private_message', (data) => {
  // Kirim ke penerima
  io.to(`user_${data.receiver_id}`).emit('new_message', data);
  // Kirim balik ke pengirim juga
  io.to(`user_${data.sender_id}`).emit('new_message', data);
});

// Emit negotiation
socket.on('new_negotiation', (data) => {
  console.log('Negotiation event:', data);
  io.to(`user_${data.user2_id}`).emit('negotiation_received', data);
  io.to(`user_${data.user1_id}`).emit('negotiation_received', data);
});

  socket.on('disconnect', () => {
    console.log('User terputus:', socket.id);
  });
});


// Routes (akan kita tambahkan di fase berikutnya)
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/posts', require('./src/routes/posts'));
app.use('/api/profile', require('./src/routes/profile'));
app.use('/api/messages', require('./src/routes/messages'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/chat', require('./src/routes/chat'));


// Halaman utama redirect ke auth
app.get('/', (req, res) => {
  res.redirect('/views/auth.html');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server berjalan di http://localhost:${PORT}`);
});