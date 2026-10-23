import { Redirect } from 'expo-router';

import { DevSessionScreen } from '@/features/dev/DevSessionScreen';

// Connexion d'un compte de test par lien : en développement seulement.
export default function DevSession() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DevSessionScreen />;
}
