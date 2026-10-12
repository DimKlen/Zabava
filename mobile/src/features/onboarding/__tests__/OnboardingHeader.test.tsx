import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import type { OnboardingStep } from '@/domain/onboarding';

import { OnboardingHeader } from '../OnboardingHeader';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

async function renderHeader(step: OnboardingStep) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <OnboardingHeader step={step} />
    </SafeAreaProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('OnboardingHeader', () => {
  it.each([
    ['region', '/onboarding/platforms'],
    ['platforms', '/onboarding/titles'],
    ['titles', '/onboarding/notifications'],
  ] as const)('« Passer » depuis %s mène à %s', async (step, target) => {
    await renderHeader(step);
    await fireEvent.press(screen.getByText('Passer'));
    expect(router.push).toHaveBeenCalledWith(target);
  });

  it("n'affiche pas de retour à l'étape 1", async () => {
    await renderHeader('region');
    expect(screen.queryByLabelText('Retour')).toBeNull();
  });

  it('revient en arrière aux étapes 2 et 3', async () => {
    await renderHeader('titles');
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(router.back).toHaveBeenCalled();
  });

  it("remplace par l'étape précédente quand la pile est vide", async () => {
    jest.mocked(router.canGoBack).mockReturnValueOnce(false);
    await renderHeader('platforms');
    await fireEvent.press(screen.getByLabelText('Retour'));
    expect(router.replace).toHaveBeenCalledWith('/onboarding/region');
  });
});
