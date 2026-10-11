import { Redirect } from 'expo-router';

import { KitchenSinkScreen } from '@/features/dev/KitchenSinkScreen';

// Écran de démonstration des composants : en développement seulement.
export default function KitchenSink() {
  if (!__DEV__) return <Redirect href="/" />;
  return <KitchenSinkScreen />;
}
