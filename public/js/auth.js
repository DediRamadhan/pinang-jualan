// Cek apakah user sudah login, kalau tidak redirect ke auth
function cekLogin() {
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = '/views/auth.html';
  }
  return token;
}

// Cek apakah user adalah admin
function cekAdmin() {
  const role = localStorage.getItem('role');
  if (role !== 'admin') {
    alert('Akses ditolak: Hanya admin yang bisa');
    window.location.href = '/views/home.html';
  }
}

// Logout
function logout() {
  localStorage.clear();
  window.location.href = '/views/auth.html';
}