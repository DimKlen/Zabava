import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchTrendingPosterPaths } from '@/api/catalog';

const KEY = 'zabava.login-mosaic';

/**
 * L'écran de connexion s'affiche sans session : l'API des tendances n'y est pas
 * accessible. On garde donc les affiches de la dernière session ouverte.
 */
export async function loadMosaicPosters(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const paths: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(paths) ? paths.filter((path) => typeof path === 'string') : [];
  } catch {
    return [];
  }
}

/** Mémorise les affiches tendance (appelé une fois connecté, sans bloquer). */
export async function rememberMosaicPosters(): Promise<void> {
  try {
    const paths = await fetchTrendingPosterPaths();
    if (paths.length > 0) await AsyncStorage.setItem(KEY, JSON.stringify(paths));
  } catch {
    // Sans réseau, la mosaïque garde les affiches précédentes ou les dégradés.
  }
}
