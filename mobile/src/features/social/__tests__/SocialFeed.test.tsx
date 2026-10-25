import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { profileKey } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { feedKey } from '@/api/social';
import { watchlistKey } from '@/api/watchlist';

import { ActivityCarousel } from '../ActivityCarousel';
import { FeedScreen } from '../FeedScreen';
import { TitleSocialBlocks } from '../TitleSocialBlocks';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/api/http', () => ({ api: jest.fn() }));
jest.mock('@/api/queryClient', () => {
  const { QueryClient } =
    jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    queryClient: new QueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity, retry: false },
        mutations: { gcTime: Infinity },
      },
    }),
  };
});
jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: () => ({ isConnected: true }) }));

const mockApi = api as jest.MockedFunction<typeof api>;

/** La requête a répondu (succès ou échec). */
const settled = (queryKey: readonly unknown[]) =>
  waitFor(() => expect(queryClient.getQueryState(queryKey)?.fetchStatus).toBe('idle'));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const member = (username: string, displayName: string, extra: object = {}) => ({
  username,
  displayName,
  followState: 'following',
  followsMe: false,
  commonCount: 0,
  ...extra,
});

const BEAR = { id: 'tv-136315', tmdbId: 136315, type: 'tv', title: 'The Bear' };
const DUNE = { id: 'movie-693134', tmdbId: 693134, type: 'movie', title: 'Dune 3' };

const now = new Date();
const today = (h: number, m = 0) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).toISOString();
const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 22).toISOString();

const ACTIVITIES = [
  {
    id: '1',
    createdAt: today(0, 1),
    actor: member('lea.m', 'Léa Martin'),
    type: 'watched_episodes',
    title: BEAR,
    episode: { id: 45, season: 4, number: 5, name: 'Tonnerre', stillPath: '/s.jpg' },
    count: 1,
    inMyList: true,
  },
  {
    id: '2',
    createdAt: yesterday,
    actor: member('max.dubois', 'Max Dubois'),
    type: 'added',
    title: DUNE,
    count: 1,
    inMyList: true,
  },
];

function routeFeed(items: unknown[]) {
  mockApi.mockImplementation(async (path) => {
    if (path === '/me/feed') return { items };
    if (path === '/me/watchlist') return [];
    throw new Error(`Route non simulée : ${path}`);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  onlineManager.setOnline(true);
  queryClient.setQueryData(profileKey, { id: 'u1', username: 'dim.k', spoilerProtection: false });
  queryClient.setQueryData(watchlistKey('tv'), []);
  queryClient.setQueryData(watchlistKey('anime'), []);
});

async function show(element: ReactElement) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('FeedScreen', () => {
  it('groupes « Aujourd’hui » et « Hier », phrases ; pastille sur l’affiche seulement', async () => {
    routeFeed(ACTIVITIES);
    await show(<FeedScreen />);
    expect(await screen.findByText("Aujourd'hui")).toBeTruthy();
    expect(screen.getByText('Hier')).toBeTruthy();
    expect(screen.getByText(/a vu S04 E05 « Tonnerre » de/)).toBeTruthy();
    expect(screen.getByText(/a ajouté/)).toBeTruthy();
    // The Bear (vignette d'épisode) n'a pas de pastille ; Dune 3 (affiche) en a une.
    expect(screen.getAllByLabelText('Dans ma liste')).toHaveLength(1);
  });

  it('anti-spoiler : épisode non vu sans son titre', async () => {
    queryClient.setQueryData(profileKey, { id: 'u1', username: 'dim.k', spoilerProtection: true });
    routeFeed(ACTIVITIES);
    await show(<FeedScreen />);
    expect(await screen.findByText(/a vu S04 E05 de/)).toBeTruthy();
    expect(screen.queryByText(/Tonnerre/)).toBeNull();
  });

  it('anti-spoiler : épisode que j’ai vu, en clair', async () => {
    queryClient.setQueryData(profileKey, { id: 'u1', username: 'dim.k', spoilerProtection: true });
    queryClient.setQueryData(watchlistKey('tv'), [
      { id: 'tv-136315', episodes: [{ id: 45, season: 4, number: 5, watchedAt: today(0) }] },
    ]);
    routeFeed(ACTIVITIES);
    await show(<FeedScreen />);
    expect(await screen.findByText(/« Tonnerre »/)).toBeTruthy();
  });

  it('vide : « Ajoute des amis… » et « Ajouter un ami »', async () => {
    routeFeed([]);
    await show(<FeedScreen />);
    expect(await screen.findByText("Ajoute des amis pour voir ce qu'ils regardent")).toBeTruthy();
    await fireEvent.press(screen.getByText('Ajouter un ami'));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/search', params: { tab: 'members' } });
  });
});

describe('ActivityCarousel', () => {
  it('masqué quand le fil est vide', async () => {
    routeFeed([]);
    await show(<ActivityCarousel />);
    await settled(feedKey);
    expect(screen.queryByText('Activité de tes amis')).toBeNull();
  });

  it('6 dernières activités et « Tout voir » vers le fil', async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ ...ACTIVITIES[1], id: String(i) }));
    routeFeed(many);
    await show(<ActivityCarousel />);
    expect(await screen.findByText('Activité de tes amis')).toBeTruthy();
    expect(screen.getAllByText('Max')).toHaveLength(6);
    await fireEvent.press(screen.getByText('Tout voir'));
    expect(router.push).toHaveBeenCalledWith('/feed');
  });

  it('hors ligne sans cache : masqué', async () => {
    mockApi.mockRejectedValue(new TypeError('Network request failed'));
    await show(<ActivityCarousel />);
    await settled(feedKey);
    expect(queryClient.getQueryState(feedKey)?.status).toBe('error');
    expect(screen.queryByText('Activité de tes amis')).toBeNull();
  });
});

describe('TitleSocialBlocks', () => {
  const holder = (username: string, displayName: string, followState: string, date: string) => ({
    user: member(username, displayName, { followState, commonCount: 4 }),
    status: 'watched',
    date,
  });

  function routeSocial(social: unknown) {
    mockApi.mockImplementation(async (path) => {
      if (path === '/titles/movie/693134/social') return social;
      throw new Error(`Route non simulée : ${path}`);
    });
  }

  it('aucun ami sur ce titre : pas de carte', async () => {
    routeSocial({ following: [] });
    await show(<TitleSocialBlocks type="movie" tmdbId={693134} title="Dune 3" />);
    await settled(['title', 'movie', 693134, 'social']);
    expect(screen.queryByText('Tes amis')).toBeNull();
    expect(screen.queryByText("Ils l'ont vu")).toBeNull();
  });

  it('« Tes amis » : prénoms, puis la sheet de leurs statuts', async () => {
    routeSocial({
      following: [
        holder('sarah.l', 'Sarah Lefebvre', 'following', '2026-10-20T20:00:00Z'),
        holder('lea.m', 'Léa Martin', 'following', '2026-10-12T20:00:00Z'),
      ],
    });
    await show(<TitleSocialBlocks type="movie" tmdbId={693134} title="Dune 3" />);
    expect(await screen.findByText('Tes amis')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Tes amis : Sarah et Léa'));
    expect(await screen.findByText('Sarah Lefebvre')).toBeTruthy();
    expect(screen.getAllByText(/^Vu le /)).toHaveLength(2);
  });
});
