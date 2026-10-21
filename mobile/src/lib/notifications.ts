import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Localization from 'expo-localization';
import { router } from 'expo-router';
import { Linking, PermissionsAndroid, Platform } from 'react-native';

import { easProjectId } from '@/api/config';
import { api } from '@/api/http';

import { loadNotifications } from './expoNotifications';

/** Jeton Expo enregistré par cet appareil : retiré du compte à la déconnexion. */
const TOKEN_KEY = 'zabava.push-token';
/** Demande système déjà faite sur cet appareil, ou écartée par « Plus tard ». */
const ASKED_KEY = 'zabava.push-asked';

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

async function ensureChannel(Notifications: typeof import('expo-notifications')): Promise<void> {
  // Android 13+ : un canal doit exister avant la demande, sinon elle n'apparaît pas.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Zabava',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** « Plus tard » à l'onboarding : pas de demande au démarrage sur cet appareil. */
export async function markNotificationPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, '1');
}

/** Vraie boîte de dialogue système. Renvoie true si l'utilisateur accepte. */
export async function requestNotificationPermission(): Promise<boolean> {
  await markNotificationPermissionAsked();
  if (isExpoGoAndroid()) {
    // Avant Android 13, la permission est accordée d'office.
    if (Number(Platform.Version) < 33) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  const Notifications = await loadNotifications();
  await ensureChannel(Notifications);
  const { granted } = await Notifications.requestPermissionsAsync();
  return granted;
}

export type PermissionState = 'granted' | 'undetermined' | 'blocked';

/** État de la permission, sans rien demander. */
export async function notificationPermission(): Promise<PermissionState> {
  if (isExpoGoAndroid()) {
    if (Number(Platform.Version) < 33) return 'granted';
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    // Android ne dit pas si la demande est encore possible : elle le dira à la demande.
    return granted ? 'granted' : 'undetermined';
  }
  const Notifications = await loadNotifications();
  const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
  if (granted) return 'granted';
  return canAskAgain ? 'undetermined' : 'blocked';
}

/**
 * Avant d'activer une notification (Profil) : permission accordée, sinon demande système ;
 * si elle est bloquée, ouverture des réglages du téléphone. Renvoie true si accordée.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const state = await notificationPermission();
  if (state === 'granted') return true;
  if (state === 'undetermined') {
    if (isExpoGoAndroid()) {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
      if (result !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return false;
    } else {
      if (await requestNotificationPermission()) {
        await registerPushToken().catch(() => undefined);
        return true;
      }
      return false;
    }
  }
  await Linking.openSettings();
  return false;
}

/**
 * Enregistre le jeton Expo Push et le fuseau (`POST /me/push-token`).
 * Sans identifiant EAS (Expo Go, build local non lié), il n'y a pas de jeton : on s'arrête là.
 */
export async function registerPushToken(): Promise<void> {
  const projectId = easProjectId();
  if (!projectId || isExpoGoAndroid()) return;
  const Notifications = await loadNotifications();
  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api('/me/push-token', {
    method: 'POST',
    body: { expoToken: data, platform: Platform.OS, timezone: deviceTimezone() },
  });
  await AsyncStorage.setItem(TOKEN_KEY, data);
}

/**
 * Demande système si elle n'a encore jamais eu de réponse (cloche d'une fiche, démarrage) ;
 * acceptée, le jeton est enregistré.
 */
export async function askNotificationPermission(): Promise<void> {
  if ((await notificationPermission()) !== 'undetermined') return;
  if (await requestNotificationPermission()) await registerPushToken();
}

/**
 * Au démarrage, connecté : jeton et fuseau tenus à jour si la permission est accordée.
 * Une installation dont le compte a déjà fait l'onboarding (APK installé après coup,
 * réinstallation) n'a jamais affiché la demande système : sans elle, Android 13+ bloque
 * les notifications et aucun jeton n'est enregistré. Elle est donc faite une fois, si
 * `wanted` (au moins une notification activée dans le profil).
 */
export async function refreshPushToken(wanted: () => Promise<boolean>): Promise<void> {
  if (isExpoGoAndroid()) return;
  if ((await notificationPermission()) === 'granted') {
    await registerPushToken();
    return;
  }
  if ((await AsyncStorage.getItem(ASKED_KEY)) || !(await wanted())) return;
  await askNotificationPermission();
}

/** Notification reçue l'app ouverte : affichée comme en arrière-plan. */
export async function showNotificationsInForeground(): Promise<void> {
  if (isExpoGoAndroid()) return;
  const Notifications = await loadNotifications();
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
  });
}

/** Déconnexion : ce téléphone ne reçoit plus les notifications du compte. */
export async function unregisterPushToken(): Promise<void> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await api('/me/push-token', { method: 'DELETE', body: { expoToken: token } }).catch(
    () => undefined,
  );
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/**
 * Ouvre le lien profond d'une notification (`zabava://title/…`, `zabava://upcoming`).
 * La pile est reconstruite : Ma liste, puis la fiche, pour que « retour » y ramène.
 */
export function openNotificationUrl(url: string): void {
  const path = url.replace(/^[a-z]+:\/\//, '/');
  if (path.startsWith('/upcoming')) {
    router.navigate('/(tabs)/upcoming');
    return;
  }
  if (!path.startsWith('/title/')) return;
  router.navigate('/(tabs)/watchlist');
  router.push(path as Parameters<typeof router.push>[0]);
}

/**
 * Taps sur les notifications : à chaud (écouteur) et à froid (dernière réponse au
 * lancement). Renvoie la fonction de désabonnement. Rien dans Expo Go sur Android.
 */
export function listenToNotificationTaps(): () => void {
  if (isExpoGoAndroid()) return () => undefined;
  let subscription: { remove: () => void } | undefined;
  let cancelled = false;
  void loadNotifications().then(async (Notifications) => {
    if (cancelled) return;
    const handle = (response: import('expo-notifications').NotificationResponse) => {
      const url = response.notification.request.content.data?.url;
      if (typeof url === 'string') openNotificationUrl(url);
    };
    subscription = Notifications.addNotificationResponseReceivedListener(handle);
    const last = await Notifications.getLastNotificationResponseAsync();
    if (last && !cancelled) {
      handle(last);
      await Notifications.clearLastNotificationResponseAsync();
    }
  });
  return () => {
    cancelled = true;
    subscription?.remove();
  };
}
