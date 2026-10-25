import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { profileKey, type Profile } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { watchlistKey } from '@/api/watchlist';
import { useUiStore } from '@/store/ui';

import { BlockedScreen } from '../BlockedScreen';
import { FollowRequestsScreen } from '../FollowRequestsScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true },
}));
jest.mock('@/api/http', () => {
  class MockApiError extends Error {
    status: number;
    constructor(code: number) {
      super(`HTTP ${code}`);
      this.status = code;
    }
  }
  return { api: jest.fn(), ApiError: MockApiError };
});
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

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const ME = {
  id: 'u1',
  username: 'dim.k',
  displayName: 'Dim Kovac',
  friendsCount: 2,
  followRequestsCount: 2,
};

const member = (username: string, displayName: string, extra: object = {}) => ({
  username,
  displayName,
  followState: 'requested',
  followsMe: false,
  commonCount: 0,
  ...extra,
});

const LEA = member('lea.m', 'Léa Martin');
const MAX = member('max.dubois', 'Max Dubois');

function routes(overrides: Record<string, (options?: { method?: string }) => unknown> = {}) {
  mockApi.mockImplementation(async (path, options) => {
    const custom = overrides[path];
    if (custom) return custom(options);
    if (path === '/me/follow-requests') return { items: [LEA, MAX] };
    if (path === '/me/blocks') return [member('x.y', 'Xavier Y', { followState: 'blocked' })];
    return undefined;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  onlineManager.setOnline(true);
  queryClient.setQueryData(profileKey, ME);
  for (const type of ['movie', 'tv', 'anime'] as const)
    queryClient.setQueryData(watchlistKey(type), []);
  routes();
});

afterEach(() => useUiStore.getState().hideToast());

async function show(element: ReactElement) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

const profile = () => queryClient.getQueryData<Profile>(profileKey);

describe('FollowRequestsScreen', () => {
  it('accepter : la ligne disparaît, toast « Léa et toi êtes maintenant amis », compteurs à jour', async () => {
    await show(<FollowRequestsScreen />);
    expect(await screen.findByText('2 demandes')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Accepter @lea.m'));
    await waitFor(() => expect(screen.queryByText('Léa Martin')).toBeNull());
    expect(mockApi).toHaveBeenCalledWith('/me/follow-requests/lea.m/accept', { method: 'POST' });
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe('Léa et toi êtes maintenant amis'),
    );
    expect(profile()).toMatchObject({ followRequestsCount: 1, friendsCount: 3 });
    // Une seule demande : plus de « Tout accepter ».
    expect(screen.queryByText('Tout accepter')).toBeNull();
  });

  it('refuser : la ligne disparaît, sans toast', async () => {
    await show(<FollowRequestsScreen />);
    await fireEvent.press(await screen.findByLabelText('Refuser @max.dubois'));
    await waitFor(() => expect(screen.queryByText('Max Dubois')).toBeNull());
    expect(mockApi).toHaveBeenCalledWith('/me/follow-requests/max.dubois/decline', {
      method: 'POST',
    });
    expect(useUiStore.getState().toast).toBeNull();
    expect(profile()?.followRequestsCount).toBe(1);
  });

  it('« Tout accepter » : toast « 2 demandes acceptées », puis « Aucune demande »', async () => {
    await show(<FollowRequestsScreen />);
    await fireEvent.press(await screen.findByText('Tout accepter'));
    expect(await screen.findByText('Aucune demande')).toBeTruthy();
    expect(mockApi).toHaveBeenCalledWith('/me/follow-requests/accept-all', { method: 'POST' });
    await waitFor(() => expect(useUiStore.getState().toast?.message).toBe('2 demandes acceptées'));
    expect(profile()).toMatchObject({ followRequestsCount: 0, friendsCount: 4 });
  });

  it('échec : la demande revient à sa place, compteurs d’avant', async () => {
    routes({
      '/me/follow-requests/lea.m/accept': () => Promise.reject(new Error('500')),
    });
    await show(<FollowRequestsScreen />);
    await fireEvent.press(await screen.findByLabelText('Accepter @lea.m'));
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe("Impossible d'enregistrer, réessaie"),
    );
    expect(screen.getByText('Léa Martin')).toBeTruthy();
    expect(profile()).toMatchObject({ followRequestsCount: 2, friendsCount: 2 });
  });

  it('hors ligne : rien ne change, « Connexion requise »', async () => {
    await show(<FollowRequestsScreen />);
    await screen.findByText('Léa Martin');
    onlineManager.setOnline(false);
    await fireEvent.press(screen.getByLabelText('Accepter @lea.m'));
    expect(useUiStore.getState().toast?.message).toBe('Connexion requise');
    expect(screen.getByText('Léa Martin')).toBeTruthy();
  });

  it('une ligne ouvre le profil', async () => {
    await show(<FollowRequestsScreen />);
    await fireEvent.press(await screen.findByText('Léa Martin'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/u/[username]',
      params: { username: 'lea.m' },
    });
  });
});

describe('BlockedScreen', () => {
  it('« Débloquer » : la ligne disparaît, toast « @x.y est débloqué·e »', async () => {
    await show(<BlockedScreen />);
    await fireEvent.press(await screen.findByLabelText('Débloquer @x.y'));
    expect(await screen.findByText('Aucun compte bloqué')).toBeTruthy();
    expect(mockApi).toHaveBeenCalledWith('/users/x.y/block', { method: 'DELETE' });
    await waitFor(() => expect(useUiStore.getState().toast?.message).toBe('@x.y est débloqué·e'));
  });
});
