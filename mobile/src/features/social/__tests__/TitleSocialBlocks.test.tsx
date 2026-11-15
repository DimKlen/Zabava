import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { profileKey } from '@/api/profile';
import { queryClient } from '@/api/queryClient';

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
  commonCount: 0,
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  onlineManager.setOnline(true);
  queryClient.setQueryData(profileKey, { id: 'u1', username: 'dim.k', spoilerProtection: false });
});

async function show(element: ReactElement) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

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

  it('aucun abonnement sur ce titre : pas de carte', async () => {
    routeSocial({ following: [] });
    await show(<TitleSocialBlocks type="movie" tmdbId={693134} title="Dune 3" />);
    await settled(['title', 'movie', 693134, 'social']);
    expect(screen.queryByText('Tes abonnements')).toBeNull();
    expect(screen.queryByText("Ils l'ont vu")).toBeNull();
  });

  it('« Tes abonnements » : prénoms, puis la sheet de leurs statuts', async () => {
    routeSocial({
      following: [
        holder('sarah.l', 'Sarah Lefebvre', 'following', '2026-10-20T20:00:00Z'),
        holder('lea.m', 'Léa Martin', 'following', '2026-10-12T20:00:00Z'),
      ],
    });
    await show(<TitleSocialBlocks type="movie" tmdbId={693134} title="Dune 3" />);
    expect(await screen.findByText('Tes abonnements')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Tes abonnements : Sarah et Léa'));
    expect(await screen.findByText('Sarah Lefebvre')).toBeTruthy();
    expect(screen.getAllByText(/^Vu le /)).toHaveLength(2);
  });
});
