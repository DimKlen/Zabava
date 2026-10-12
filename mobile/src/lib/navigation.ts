import { router } from 'expo-router';

/**
 * Retour d'une fiche. Ouverte par un lien profond (notification), elle n'a pas
 * d'écran précédent : on revient alors sur Ma liste.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/(tabs)/watchlist');
}
