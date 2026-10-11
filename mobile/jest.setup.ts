import { setUpTests } from 'react-native-reanimated';

// Reanimated : animations exécutées de façon synchrone dans les tests.
setUpTests();

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
}));
