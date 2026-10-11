import * as Localization from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { easProjectId } from '@/api/config';
import { api } from '@/api/http';

/** Fuseau IANA du téléphone (America/Toronto…). */
export function deviceTimezone(): string | undefined {
  return Localization.getCalendars()[0]?.timeZone ?? undefined;
}

/** Vraie boîte de dialogue système. Renvoie true si l'utilisateur accepte. */
export async function requestNotificationPermission(): Promise<boolean> {
  // Android 13+ : un canal doit exister avant la demande, sinon elle n'apparaît pas.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Zabava',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

/**
 * Enregistre le jeton Expo Push et le fuseau (`POST /me/push-token`).
 * Sans identifiant EAS (Expo Go, build local non lié), il n'y a pas de jeton : on s'arrête là.
 */
export async function registerPushToken(): Promise<void> {
  const projectId = easProjectId();
  if (!projectId) return;
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api('/me/push-token', {
    method: 'POST',
    body: { expoToken: data, platform: Platform.OS, timezone: deviceTimezone() },
  });
}
