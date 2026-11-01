import { setUpTests } from 'react-native-reanimated';

// Reanimated : animations exécutées de façon synchrone dans les tests.
setUpTests();

// Module natif absent de Jest : mock officiel en mémoire.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Téléphone en français : les tests lisent l'interface de référence.
jest.mock('expo-localization', () => ({
  ...jest.requireActual<typeof import('expo-localization')>('expo-localization'),
  getLocales: () => [{ languageCode: 'fr', languageTag: 'fr-CA' }],
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Lecteur de bande-annonce : module natif absent de Jest, une simple vue garde ses props.
jest.mock('react-native-webview', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { WebView: View };
});
