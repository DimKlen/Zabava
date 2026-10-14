import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { formatTime } from '@/domain/format';
import { useUiStore } from '@/store/ui';

import { UpcomingScreen } from '../UpcomingScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  useScrollToTop: jest.fn(),
}));
jest.mock('@/api/http', () => ({ api: jest.fn() }));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
}));

const mockApi = api as jest.MockedFunction<typeof api>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

// Samedi 10 octobre 2026, 12 h locale.
const NOW = new Date(2026, 9, 10, 12, 0);
const at = (days: number, hour: number) => new Date(2026, 9, 10 + days, hour).toISOString();

const bear = { id: 'tv-1', tmdbId: 1, type: 'tv', title: 'The Bear' };
const dune = { id: 'movie-2', tmdbId: 2, type: 'movie', title: 'Dune' };
const frieren = { id: 'anime-3', tmdbId: 3, type: 'anime', title: 'Frieren' };

const UPCOMING = {
  events: [
    {
      date: '2026-10-12',
      kind: 'episode',
      title: bear,
      season: 4,
      episode: 3,
      airstamp: at(2, 21),
      provider: 'Disney+',
    },
    { date: '2026-10-20', kind: 'theatrical', title: dune },
  ],
  noDate: [{ title: frieren, nextSeason: 2 }],
};

async function renderUpcoming() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>
        <UpcomingScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

beforeAll(() => jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] }));
afterAll(() => jest.useRealTimers());

beforeEach(async () => {
  jest.clearAllMocks();
  mockApi.mockResolvedValue(UPCOMING);
  await act(() => useUiStore.setState({ upcomingFilter: 'all', noDateOpen: false, toast: null }));
});

describe('UpcomingScreen', () => {
  it('épisode dans 2 jours sous le bon jour, avec l’heure locale ; film « Sortie en salle »', async () => {
    await renderUpcoming();
    expect(await screen.findByText('Lun. 12 oct.')).toBeTruthy();
    expect(screen.getByText(`S04 E03 · ${formatTime(new Date(at(2, 21)))}`)).toBeTruthy();
    expect(screen.getByText('Disney+')).toBeTruthy();
    expect(screen.getByText('Mar. 20 oct.')).toBeTruthy();
    expect(screen.getByText('Sortie en salle')).toBeTruthy();
    expect(screen.getByText('Cinéma')).toBeTruthy();
    expect(mockApi).toHaveBeenCalledWith('/me/upcoming', {
      query: { from: '2026-10-10', to: '2027-01-08', type: 'all' },
    });
  });

  it('bande de la semaine : point le jour de l’épisode, saut au jour', async () => {
    await renderUpcoming();
    await screen.findByText('Lun. 12 oct.');
    expect(screen.getByLabelText('Lun 12, événements')).toBeTruthy();
    expect(screen.getByLabelText('Dim 11')).toBeTruthy();

    // Position pas encore mesurée : pas de toast trompeur.
    await fireEvent.press(screen.getByLabelText('Dim 11'));
    expect(useUiStore.getState().toast).toBeNull();

    const scrollTo = jest.spyOn(ScrollView.prototype, 'scrollTo');
    await fireEvent(screen.getByTestId('group-2026-10-12'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 500, width: 390, height: 120 } },
    });
    await fireEvent.press(screen.getByLabelText('Dim 11'));
    // Premier groupe dont le jour est ≥ dimanche : lundi 12, sous la bande (− 72).
    expect(scrollTo).toHaveBeenCalledWith({ y: 428, animated: true });
    scrollTo.mockRestore();
  });

  it('aucun événement à partir du jour touché : toast', async () => {
    mockApi.mockResolvedValue({ events: [UPCOMING.events[0]], noDate: [] });
    await renderUpcoming();
    await screen.findByText('Lun. 12 oct.');
    await fireEvent.press(screen.getByLabelText('Mar 13'));
    expect(useUiStore.getState().toast?.message).toBe('Rien de prévu à partir de ce jour');
  });

  it('Sans date repliée par défaut, dépliée au tap', async () => {
    await renderUpcoming();
    await screen.findByText('Sans date');
    expect(screen.queryByText('Saison 2 annoncée, date à venir')).toBeNull();
    await fireEvent.press(screen.getByText('Sans date'));
    expect(screen.getByText('Saison 2 annoncée, date à venir')).toBeTruthy();
  });

  it('vide : « Rien de prévu » et lien vers Découvrir › Séries', async () => {
    mockApi.mockResolvedValue({ events: [], noDate: [] });
    await renderUpcoming();
    await fireEvent.press(await screen.findByText('Suivre des séries'));
    expect(useUiStore.getState().discoverTab).toBe('tv');
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/discover');
  });

  it('filtre : la requête suit la chip', async () => {
    await renderUpcoming();
    await screen.findByText('Lun. 12 oct.');
    await fireEvent.press(screen.getByText('Animés'));
    expect(mockApi).toHaveBeenLastCalledWith('/me/upcoming', {
      query: expect.objectContaining({ type: 'anime' }),
    });
  });
});
