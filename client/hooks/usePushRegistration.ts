import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { DEV_USE_MOCKS } from '@/constants/devFlags';
import { registerPushToken } from '@/lib/backend';
import { getDeviceToken, pushPermissionGranted } from '@/lib/push';

const PREF_KEY = 'pushRepliesEnabled';
const TOKEN_KEY = 'pushToken';
const PROMPTED_KEY = 'pushPrompted';

/**
 * Away-reply push registration. Runs once per signed-in session: unless the user turned the
 * "companion replied" pref off, make sure permission exists — asking exactly once, on the
 * first post-auth Home arrival (not the cold open) — and mirror the device token to the
 * server. Re-running is harmless (the server upserts with onConflictDoNothing), which also
 * heals token rotation across reinstalls. Mock mode has nothing to register against.
 */
export function usePushRegistration(signedIn: boolean): void {
  useEffect(() => {
    if (!signedIn || DEV_USE_MOCKS) return;
    let cancelled = false;
    void (async () => {
      const pref = await AsyncStorage.getItem(PREF_KEY);
      if (pref === 'false') return;
      const prompted = (await AsyncStorage.getItem(PROMPTED_KEY)) === 'true';
      const granted = await pushPermissionGranted(!prompted);
      if (!prompted) await AsyncStorage.setItem(PROMPTED_KEY, 'true').catch(() => {});
      if (!granted || cancelled) return;
      const token = await getDeviceToken();
      if (!token || cancelled) return;
      await registerPushToken(token).catch(() => {});
      await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);
}
