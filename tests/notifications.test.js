const test = require('node:test');
const assert = require('node:assert/strict');
const { buildChatNotificationTitle, buildChatNotificationBody } = require('../public/js/notifications.js');

test('buildChatNotificationTitle uses sender name when available', () => {
  const title = buildChatNotificationTitle({ nama_sender: 'Rina', isi: 'Halo' });
  assert.equal(title, 'Pesan baru dari Rina');
});

test('buildChatNotificationBody falls back to a friendly default', () => {
  const body = buildChatNotificationBody({ isi: '' });
  assert.equal(body, 'Ada pesan baru di chat Anda');
});
