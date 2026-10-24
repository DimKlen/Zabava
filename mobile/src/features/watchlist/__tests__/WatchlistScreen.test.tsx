import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LIBRARY } from '@/domain/__fixtures__/prototypeFilms';
import type { LibraryMovie } from '@/domain/watchlist';
import { useUiStore } from '@/store/ui';

import { WatchlistScreen } from '../WatchlistScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  useScrollToTop: jest.fn(),
}));
jest.mock('@/api/profile', () => ({ useProfile: () => ({ data: { providerIds: [] } }) }));
jest.mock('@/api/libraryActions', () => ({ toggleInList: jest.fn() }));
let mockFilms: LibraryMovie[] = [];
jest.mock('@/api/watchlist', () => ({
  useMovieWatchlist: () => ({ data: mockFilms, isError: false, refetch: jest.fn() }),
  useSeriesWatchlist: () => ({ data: [], isError: false, refetch: jest.fn() }),
}));
jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: () => ({ isConnected: true }) }));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 10, 12, 0) }));
afterAll(() => jest.useRealTimers());

beforeEach(async () => {
  mockFilms = LIBRARY;
  await act(() =>
    useUiStore.setState({ watchlistTab: 'movie', watchlistQuery: null, filmFilter: 'all' }),
  );
});

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <WatchlistScreen />
    </SafeAreaProvider>,
  );
  await act(() => jest.advanceTimersByTime(700));
}

describe('WatchlistScreen › filtre par nom', () => {
  it('la loupe filtre Ma liste, sans recherche ni filtres avancés', async () => {
    await renderScreen();
    const before = screen.getAllByTestId('poster').length;
    await fireEvent.press(screen.getByLabelText('Rechercher'));
    expect(screen.queryByLabelText('Filtres')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Filtrer ma liste'), 'odyss');
    expect(screen.getAllByTestId('poster').length).toBeLessThan(before);
    expect(screen.getAllByLabelText(/Odyssée/).length).toBeGreaterThan(0);
  });

  it('aucun titre : « Aucun titre ne correspond » ; « Annuler » rend toute la liste', async () => {
    await renderScreen();
    const before = screen.getAllByTestId('poster').length;
    await fireEvent.press(screen.getByLabelText('Rechercher'));
    await fireEvent.changeText(screen.getByLabelText('Filtrer ma liste'), 'zzzz');
    expect(screen.getByText('Aucun titre ne correspond')).toBeTruthy();
    await fireEvent.press(screen.getByText('Annuler'));
    expect(screen.getByText('Ma liste')).toBeTruthy();
    expect(screen.getAllByTestId('poster')).toHaveLength(before);
  });
});
