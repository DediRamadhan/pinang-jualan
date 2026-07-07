function buildChatNotificationTitle(message) {
  const senderName = message?.nama_sender || message?.sender_name || message?.senderName || '';
  const fallbackTitle = senderName ? `Pesan baru dari ${senderName}` : 'Pesan baru';
  return fallbackTitle;
}

function buildChatNotificationBody(message) {
  const text = (message?.isi || message?.text || '').trim();
  if (text) {
    return text.length > 80 ? `${text.slice(0, 77)}...` : text;
  }
  return 'Ada pesan baru di chat Anda';
}

function requestChatNotifications() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve({ granted: false, supported: false });
  }

  if (Notification.permission === 'granted') {
    return Promise.resolve({ granted: true, supported: true });
  }

  if (Notification.permission === 'denied') {
    return Promise.resolve({ granted: false, supported: true });
  }

  return Notification.requestPermission().then((permission) => ({
    granted: permission === 'granted',
    supported: true,
    permission
  }));
}

function showChatNotification(message) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  if (document.visibilityState === 'visible') {
    return null;
  }

  if (Notification.permission !== 'granted') {
    return null;
  }

  const title = buildChatNotificationTitle(message);
  const body = buildChatNotificationBody(message);
  const notif = new Notification(title, { body, icon: '/favicon.ico' });

  notif.onclick = () => {
    window.focus();
    notif.close();
    if (window.location.pathname !== '/views/chat.html') {
      window.location.href = '/views/chat.html';
    }
  };

  return notif;
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildChatNotificationTitle,
    buildChatNotificationBody,
    requestChatNotifications,
    showChatNotification
  };
}
