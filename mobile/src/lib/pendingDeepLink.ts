/**
 * Lien profond ouvert sans être connecté (specs/social/docs/02 §4) : gardé pendant la connexion
 * et l'onboarding, puis ouvert à l'arrivée dans l'app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'zabava.pending-deep-link';

export async function savePendingDeepLink(path: string): Promise<void> {
  await AsyncStorage.setItem(KEY, path).catch(() => undefined);
}

/** Le lien en attente, retiré du stockage (ouvert une seule fois). */
export async function takePendingDeepLink(): Promise<string | null> {
  try {
    const path = await AsyncStorage.getItem(KEY);
    if (path) await AsyncStorage.removeItem(KEY);
    return path;
  } catch {
    return null;
  }
}
