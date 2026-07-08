// APNs plumbing for the away-reply push. The server stores RAW device tokens
// (POST/DELETE /api/notifications/register) and sends through APNs itself
// (server/src/services/notifications/apns.ts), so this uses the device push
// token — not Expo's push-service token.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// The server only pushes when the user has no live WS connection, but REST turns look
// "away" too — suppress foreground presentation so an open chat never banners over
// itself. Backgrounded/killed launches still get the alert.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

/** Current permission, optionally asking (the ask is a one-shot at the OS level). */
export async function pushPermissionGranted(requestIfNeeded: boolean): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!requestIfNeeded || !current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/** Raw APNs device token, or null (no permission, non-iOS, sim without APNs, …). */
export async function getDeviceToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    return typeof data === 'string' && data.length > 0 ? data : null;
  } catch {
    return null;
  }
}
