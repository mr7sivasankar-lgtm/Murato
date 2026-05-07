/**
 * sendPush.js
 * Sends FCM push notifications using the legacy HTTP API.
 * Requires FCM_SERVER_KEY in .env
 */

const https = require('https');

/**
 * @param {string} token   - Device FCM token
 * @param {string} title   - Notification title
 * @param {string} body    - Notification body
 * @param {object} data    - Optional data payload (for navigation on tap)
 */
async function sendPush(token, title, body, data = {}) {
  const serverKey = process.env.FCM_SERVER_KEY;

  if (!serverKey || serverKey === 'paste_your_server_key_here') {
    console.warn('[Push] FCM_SERVER_KEY not set — skipping push notification');
    return;
  }

  if (!token) {
    console.warn('[Push] No FCM token — skipping');
    return;
  }

  const payload = JSON.stringify({
    to: token,
    notification: {
      title,
      body,
      sound: 'default',
    },
    data,
    priority: 'high',
    android: {
      priority: 'high',
    },
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'fcm.googleapis.com',
        path: '/fcm/send',
        method: 'POST',
        headers: {
          Authorization: `key=${serverKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          console.log('[Push] FCM response:', raw.slice(0, 100));
          resolve();
        });
      }
    );

    req.on('error', (err) => {
      console.warn('[Push] FCM request error:', err.message);
      resolve(); // never throw — push is non-critical
    });

    req.write(payload);
    req.end();
  });
}

module.exports = { sendPush };
