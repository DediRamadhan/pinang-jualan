const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../marketplace.db'));

// Aktifkan foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Buat semua tabel
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    foto_profil TEXT DEFAULT NULL,
    rating REAL DEFAULT 0,
    total_rating INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    judul TEXT NOT NULL,
    deskripsi TEXT NOT NULL,
    harga INTEGER NOT NULL,
    kategori TEXT NOT NULL,
    foto TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pending',
    alasan_reject TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    isi TEXT NOT NULL,
    dibaca INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pesan TEXT NOT NULL,
    dibaca INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS chat_threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user1_id INTEGER NOT NULL,
    user2_id INTEGER NOT NULL,
    post_id INTEGER,
    status TEXT DEFAULT 'active',
    metode_bayar TEXT DEFAULT 'belum_dipilih',
    admin_id INTEGER DEFAULT NULL,
    harga_akhir INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME,
    FOREIGN KEY (user1_id) REFERENCES users(id),
    FOREIGN KEY (user2_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (admin_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS negotiations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    penawaran_id INTEGER NOT NULL,
    harga INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    dibuat_oleh INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_threads(id),
    FOREIGN KEY (penawaran_id) REFERENCES users(id),
    FOREIGN KEY (dibuat_oleh) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    pembeli_id INTEGER NOT NULL,
    penjual_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    review TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES chat_threads(id),
    FOREIGN KEY (pembeli_id) REFERENCES users(id),
    FOREIGN KEY (penjual_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS wishlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    post_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, post_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (post_id) REFERENCES posts(id)
  );
  
`);

const messageColumns = db.prepare("PRAGMA table_info(messages)").all().map(c => c.name);
if (!messageColumns.includes('chat_id')) {
  db.prepare('ALTER TABLE messages ADD COLUMN chat_id INTEGER').run();
}

const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userColumns.includes('banned')) {
  db.prepare('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0').run();
}

// Buat akun admin default kalau belum ada
const bcrypt = require('bcryptjs');
const adminAda = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminAda) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (nama, email, password, role)
    VALUES (?, ?, ?, ?)
  `).run('Admin', 'admin@marketplace.com', hash, 'admin');
  console.log('✅ Akun admin dibuat: admin@marketplace.com / admin123');
}


module.exports = db;