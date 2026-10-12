import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { showToast, useUiStore } from '@/store/ui';

import { ToastHost } from '../Toast';

jest.mock('expo-router', () => ({ useSegments: () => ['(tabs)', 'watchlist'] }));

// Écran de 390 × 844 sans zone sûre basse : la barre d'onglets fait 84 pt.
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 0 },
};

function renderHost() {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ToastHost />
    </SafeAreaProvider>,
  );
}

beforeEach(async () => {
  jest.useFakeTimers();
  await act(() => useUiStore.getState().hideToast());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Toast', () => {
  it('disparaît après 5 s', async () => {
    await renderHost();
    await act(() => showToast('Ajouté à ma liste'));
    expect(screen.getByText('Ajouté à ma liste')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(4999));
    expect(screen.getByText('Ajouté à ma liste')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(1));
    expect(screen.queryByText('Ajouté à ma liste')).toBeNull();
  });

  it('« Annuler » restaure puis masque le toast', async () => {
    const undo = jest.fn();
    await renderHost();
    await act(() => showToast('Épisode marqué comme vu', undo));

    await fireEvent.press(screen.getByRole('button', { name: 'Annuler' }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Épisode marqué comme vu')).toBeNull();
  });

  it("n'affiche pas « Annuler » sans action d'annulation", async () => {
    await renderHost();
    await act(() => showToast('Alertes coupées pour ce titre'));
    expect(screen.queryByRole('button', { name: 'Annuler' })).toBeNull();
  });

  it('un nouveau toast remplace le précédent et relance le minuteur', async () => {
    await renderHost();
    await act(() => showToast('Premier'));
    await act(() => jest.advanceTimersByTime(3000));
    await act(() => showToast('Second'));

    expect(screen.queryByText('Premier')).toBeNull();
    await act(() => jest.advanceTimersByTime(3000));
    expect(screen.getByText('Second')).toBeTruthy();
    await act(() => jest.advanceTimersByTime(2000));
    expect(screen.queryByText('Second')).toBeNull();
  });

  it('se place à 96 pt du bas quand la barre d’onglets est visible', async () => {
    await renderHost();
    await act(() => showToast('Ajouté à ma liste'));
    expect(screen.getByTestId('toast')).toHaveStyle({ bottom: 96 });
  });
});
