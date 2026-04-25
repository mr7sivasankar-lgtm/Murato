/**
 * PushNotificationService.js
 * Initialises Capacitor PushNotifications on Android.
 * Call initPush() once after the user logs in.
 * FCM tokens are stored in the backend via PUT /api/auth/fcm-token.
 */
import api from '../api/axios';

export async function initPush() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // 1. Request permission
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    // 2. Register with FCM
    await PushNotifications.register();

    // 3. Save token to backend when FCM returns it
    await PushNotifications.addListener('registration', async ({ value: token }) => {
      try {
        await api.put('/auth/fcm-token', { fcmToken: token });
        console.log('[Push] FCM token saved:', token.slice(0, 20) + '...');
      } catch (e) {
        console.warn('[Push] Could not save FCM token', e);
      }
    });

    // 4. Handle foreground notifications as a toast
    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const { default: toast } = require('react-hot-toast');
      toast(`🔔 ${notification.title}: ${notification.body}`, { duration: 5000 });
    });

    // 5. Handle tap on notification (app was backgrounded/closed)
    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification?.data || {};
      // Navigate based on payload data
      if (data.type === 'chat' && data.chatId) {
        window.location.hash = `/chat/${data.chatId}`;
      } else if (data.type === 'ad' && data.adId) {
        window.location.hash = `/ads/${data.adId}`;
      }
    });

    // 6. Error handler
    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', err);
    });

  } catch {
    // Not running inside Capacitor (web browser) — ignore silently
  }
}

export async function clearPushListeners() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners();
  } catch { /* ignore */ }
}
