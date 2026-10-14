/**
 * Chargement à la demande d'expo-notifications : le module plante l'app dès son chargement
 * dans Expo Go sur Android (voir notifications.ts). Isolé ici pour être simulé en test.
 */
export function loadNotifications(): Promise<typeof import('expo-notifications')> {
  return import('expo-notifications');
}
