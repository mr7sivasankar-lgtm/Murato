/**
 * PushNotificationService.js
 * Initialises Capacitor PushNotifications on Android.
 * Call initPush() once after the user logs in.
 * FCM tokens are stored in the backend via PUT /api/auth/fcm-token.
 */
import api from '../api/axios';
import toast from 'react-hot-toast';

let listenersAdded = false;

export async function initPush() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // 1. Request permission
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') {
      console.log('[Push] Permission not granted:', perm.receive);
      return;
    }

    // 2. Register with FCM (triggers the registration event below)
    await PushNotifications.register();

    // Avoid duplicate listeners if initPush() is called more than once
    if (listenersAdded) return;
    listenersAdded = true;

    // 3. Save token to backend when FCM returns it
    PushNotifications.addListener('registration', async ({ value: token }) => {
      try {
        await api.put('/auth/fcm-token', { fcmToken: token });
        console.log('[Push] FCM token saved:', token.slice(0, 20) + '...');
      } catch (e) {
        console.warn('[Push] Could not save FCM token:', e?.message);
      }
    });

    // 4. Handle foreground notifications as an in-app toast
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      const title = notification.title || 'Myillo';
      const body  = notification.body  || '';
      toast(`🔔 ${title}: ${body}`, { duration: 5000 });
    });

    // 5. Handle tap on notification (app was backgrounded/closed)
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification?.data || {};
      if (data.type === 'chat' && data.chatId) {
        // Use full page reload to navigate (works with BrowserRouter)
        window.location.href = `/chat/${data.chatId}`;
      } else if (data.type === 'ad' && data.adId) {
        window.location.href = `/ads/${data.adId}`;
      }
    });

    // 6. Error handler
    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Registration error:', JSON.stringify(err));
    });

    console.log('[Push] Listeners registered successfully');
  } catch (err) {
    // Not running inside Capacitor (web browser) — ignore silently
    console.log('[Push] Not in Capacitor context:', err?.message);
  }
}

export async function clearPushListeners() {
  try {
    listenersAdded = false;
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.removeAllListeners();
  } catch { /* ignore */ }
}
