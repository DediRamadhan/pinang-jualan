function buildPostListQuery(options = {}) {
  const { search, kategori, sort, harga_min, harga_max } = options;
  let query = `
    SELECT posts.*, users.nama as nama_penjual
    FROM posts
    JOIN users ON posts.user_id = users.id
    WHERE posts.status = 'approved'
  `;
  const params = [];

  if (search) {
    query += ` AND (posts.judul LIKE ? OR posts.deskripsi LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  if (kategori && kategori !== 'semua') {
    query += ` AND posts.kategori = ?`;
    params.push(kategori);
  }

  if (harga_min) {
    query += ` AND posts.harga >= ?`;
    params.push(Number(harga_min));
  }

  if (harga_max) {
    query += ` AND posts.harga <= ?`;
    params.push(Number(harga_max));
  }

  const sortClause = sort === 'termurah'
    ? 'ORDER BY posts.pinned DESC, posts.harga ASC'
    : sort === 'termahal'
      ? 'ORDER BY posts.pinned DESC, posts.harga DESC'
      : 'ORDER BY posts.pinned DESC, posts.created_at DESC';

  query += ` ${sortClause}`;

  return { query, params };
}

module.exports = { buildPostListQuery };
