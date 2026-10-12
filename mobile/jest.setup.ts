import { setUpTests } from 'react-native-reanimated';

// Reanimated : animations exécutées de façon synchrone dans les tests.
setUpTests();

// Module natif absent de Jest : mock officiel en mémoire.
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
