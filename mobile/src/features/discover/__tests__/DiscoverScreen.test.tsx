import { useNetInfo } from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { useUiStore } from '@/store/ui';

import { DiscoverScreen } from '../DiscoverScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useScrollToTop: jest.fn(),
}));
jest.mock('@/api/http', () => ({ api: jest.fn() }));
jest.mock('@/api/libraryActions', () => ({ toggleInList: jest.fn(), withLibraryType: jest.fn() }));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: jest.fn(() => ({ isConnected: true })),
}));

const mockApi = api as jest.MockedFunction<typeof api>;
const mockNetInfo = useNetInfo as jest.Mock;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const lite = (id: number, title: string, type = 'movie') => ({
  id: `${type}-${id}`,
  tmdbId: id,
  type,
  title,
});

function route(path: string, query: Record<string, unknown> | undefined): unknown {
  if (path === '/me/watchlist' || path === '/titles/badges') return [];
  if (path === '/me/profile') return { providerIds: [] };
  if (path === '/discover') {
    switch (query?.list) {
      case 'trending':
        return { results: [lite(1, 'Dune'), lite(2, 'Arrival')], total: 2, page: 1 };
      case 'now_playing':
        return { results: [lite(3, 'Clayface')], total: 1, page: 1 };
      // Sans plateforme choisie : section vide, donc masquée.
      default:
        return { results: [], total: 0, page: 1 };
    }
  }
  throw new Error(`Route non simulée : ${path}`);
}

async function renderDiscover() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>
        <DiscoverScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockNetInfo.mockReturnValue({ isConnected: true });
  mockApi.mockImplementation(async (path, options) => route(path, options?.query));
  await act(() => useUiStore.setState({ discoverTab: 'movie' }));
});

describe('DiscoverScreen', () => {
  it('affiche les carrousels non vides, dans l’ordre, puis Par genre', async () => {
    await renderDiscover();
    expect(await screen.findByLabelText('Dune')).toBeTruthy();
    expect(screen.getByText('Tendances de la semaine')).toBeTruthy();
    expect(await screen.findByText('Au cinéma')).toBeTruthy();
    // Sections vides masquées.
    expect(screen.queryByText('Bientôt en salle')).toBeNull();
    expect(screen.queryByText('Nouveautés sur mes plateformes')).toBeNull();
    expect(screen.getByText('Par genre')).toBeTruthy();
  });

  it('une tuile de genre ouvre la liste du genre pour le type de l’onglet', async () => {
    await act(() => useUiStore.setState({ discoverTab: 'anime' }));
    await renderDiscover();
    await fireEvent.press(screen.getByLabelText('Science-fiction'));
    expect(router.push).toHaveBeenCalledWith('/genre/anime/science-fiction');
  });

  it('onglet Animés : la section de la saison en cours en plus', async () => {
    await act(() => useUiStore.setState({ discoverTab: 'anime' }));
    await renderDiscover();
    await screen.findByText('Tendances');
    const lists = mockApi.mock.calls
      .filter(([path]) => path === '/discover')
      .map(([, options]) => options?.query?.list);
    expect(lists).toEqual([
      'trending',
      'new_seasons',
      'popular_on_mine',
      'top_rated',
      'season_anime',
    ]);
  });

  it('hors ligne : état dédié à la place du contenu', async () => {
    mockNetInfo.mockReturnValue({ isConnected: false });
    await renderDiscover();
    expect(screen.getByText('Découvrir est indisponible hors ligne')).toBeTruthy();
    expect(
      screen.getByText('Ta liste et À venir restent accessibles depuis le cache.'),
    ).toBeTruthy();
    expect(screen.queryByText('Par genre')).toBeNull();
    expect(mockApi.mock.calls.some(([path]) => path === '/discover')).toBe(false);
  });

  it('toutes les sections en erreur : bloc « Impossible de charger »', async () => {
    mockApi.mockImplementation(async (path) => {
      if (path === '/discover') throw new Error('réseau');
      return [];
    });
    await renderDiscover();
    expect(await screen.findByText('Impossible de charger')).toBeTruthy();
  });
});
