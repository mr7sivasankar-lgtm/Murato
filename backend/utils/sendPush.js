/**
 * sendPush.js
 * Sends FCM push notifications using the Firebase Admin SDK (V1 API).
 * Requires firebase-service-account.json.json in the backend root.
 */

let admin = null;

function getAdmin() {
  if (admin) return admin;
  try {
    admin = require('firebase-admin');
    
    // On Render: read from environment variable
    // In dev: read from local file
    let serviceAccount;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      serviceAccount = require('../firebase-service-account.json.json');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (err) {
    console.warn('[Push] Firebase Admin SDK not initialized:', err.message);
    admin = null;
  }
  return admin;
}

/**
 * @param {string} token   - Device FCM token
 * @param {string} title   - Notification title
 * @param {string} body    - Notification body
 * @param {object} data    - Optional data payload (for navigation on tap)
 */
async function sendPush(token, title, body, data = {}) {
  if (!token) {
    console.warn('[Push] No FCM token — skipping');
    return;
  }

  const firebaseAdmin = getAdmin();
  if (!firebaseAdmin) {
    console.warn('[Push] Firebase Admin not available — skipping push');
    return;
  }

  // FCM data values must all be strings
  const stringData = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = String(v);
  }

  try {
    await firebaseAdmin.messaging().send({
      token,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'default' },
      },
    });
    console.log('[Push] ✅ Sent to', token.slice(0, 20) + '...');
  } catch (err) {
    console.warn('[Push] ❌ FCM error:', err.message);
    // Non-critical — never throw
  }
}

module.exports = { sendPush };
