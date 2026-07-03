const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPostListQuery } = require('../src/utils/postQuery');

test('buildPostListQuery adds filters and sort clause', () => {
  const { query, params } = buildPostListQuery({
    search: 'sepatu',
    kategori: 'fashion',
    sort: 'termurah',
    harga_min: 100000,
    harga_max: 500000
  });

  assert.match(query, /WHERE posts\.status = 'approved'/);
  assert.match(query, /AND \(posts\.judul LIKE \? OR posts\.deskripsi LIKE \?\)/);
  assert.match(query, /AND posts\.kategori = \?/);
  assert.match(query, /AND posts\.harga >= \?/);
  assert.match(query, /AND posts\.harga <= \?/);
  assert.match(query, /ORDER BY posts\.harga ASC/);
  assert.deepEqual(params, ['%sepatu%', '%sepatu%', 'fashion', 100000, 500000]);
});
