import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Localization from 'expo-localization';
import { PermissionsAndroid, Platform } from 'react-native';

import { easProjectId } from '@/api/config';
import { api } from '@/api/http';

/**
 * Expo Go sur Android n'embarque plus les notifications push (SDK 53+) : y charger
 * expo-notifications fait planter l'app. Le module n'est donc chargé qu'à la demande,
 * et jamais dans ce cas-là.
 */
function isExpoGoAndroid(): boolean {
  return (
    Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/** Fuseau IANA du téléphone (America/Toronto…). */
export function deviceTimezone(): string | undefined {
  return Localization.getCalendars()[0]?.timeZone ?? undefined;
}

/** Vraie boîte de dialogue système. Renvoie true si l'utilisateur accepte. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGoAndroid()) {
    // Avant Android 13, la permission est accordée d'office.
    if (Number(Platform.Version) < 33) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const Notifications = await import('expo-notifications');
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
  if (!projectId || isExpoGoAndroid()) return;
  const Notifications = await import('expo-notifications');
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api('/me/push-token', {
    method: 'POST',
    body: { expoToken: data, platform: Platform.OS, timezone: deviceTimezone() },
  });
}
