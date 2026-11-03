import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { toggleInList } from '@/api/libraryActions';
import { profileKey } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { watchlistKey } from '@/api/watchlist';
import { useUiStore } from '@/store/ui';

import { UserProfileScreen } from '../UserProfileScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true },
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
      defaultOptions: { queries: { gcTime: Infinity, retry: false } },
    }),
  };
});
jest.mock('@/api/libraryActions', () => ({
  toggleInList: jest.fn(),
  withLibraryType: (title: unknown) => title,
}));
jest.mock('@react-native-community/netinfo', () => ({ useNetInfo: () => ({ isConnected: true }) }));

const mockApi = api as jest.MockedFunction<typeof api>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Suivie : listes visibles. */
const LEA = {
  username: 'lea.m',
  displayName: 'Léa Martin',
  followState: 'following',
  commonCount: 8,
  friendsCount: 5,
  canSeeLists: true,
  isMe: false,
};

/** Pas suivie : en-tête seulement. */
const STRANGER = {
  ...LEA,
  followState: 'none',
  commonCount: 0,
  canSeeLists: false,
};

const DUNE = { id: 'movie-693134', tmdbId: 693134, type: 'movie', title: 'Dune : Deuxième partie' };
const ODYSSEY = { id: 'movie-1698863', tmdbId: 1698863, type: 'movie', title: "L'Odyssée" };

let profile: Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  onlineManager.setOnline(true);
  useUiStore.setState({ toast: null, actionSheet: null, actionSheetOpen: false });
  profile = { ...LEA };
  queryClient.setQueryData(profileKey, { username: 'dim.k', friendsCount: 2 });
  // Ma liste : Dune y est, L'Odyssée non.
  queryClient.setQueryData(watchlistKey('movie'), [{ id: DUNE.id, tmdbId: DUNE.tmdbId }]);
  queryClient.setQueryData(watchlistKey('tv'), []);
  queryClient.setQueryData(watchlistKey('anime'), []);
  mockApi.mockImplementation(async (path, options) => {
    if (path === '/users/lea.m') return profile;
    if (path === '/users/lea.m/titles') return { items: [{ title: DUNE }, { title: ODYSSEY }] };
    if (path === '/me/recent-profiles/lea.m') return [];
    if (path === '/users/lea.m/follow' && options?.method === 'POST') {
      profile = { ...LEA };
      return { status: 'accepted' };
    }
    if (path === '/users/lea.m/follow' && options?.method === 'DELETE') {
      profile = { ...STRANGER };
      return undefined;
    }
    return undefined;
  });
});

afterEach(() => useUiStore.getState().hideToast());

async function renderScreen() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>
        <UserProfileScreen username="lea.m" />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText('Léa Martin');
}

describe('UserProfileScreen', () => {
  it('suivie : en-tête, « 5 abonnements », titres en commun, bouton « Suivi »', async () => {
    await renderScreen();
    expect(screen.getByText('@lea.m')).toBeTruthy();
    expect(screen.getByLabelText('5 abonnements')).toBeTruthy();
    expect(screen.getByText('8 titres en commun')).toBeTruthy();
    expect(screen.getByText('Suivi')).toBeTruthy();
    expect(screen.queryByText('Te suit')).toBeNull();
    expect(mockApi).toHaveBeenCalledWith('/me/recent-profiles/lea.m', { method: 'POST' });
  });

  it('pas suivie : « Listes masquées » ; « Suivre » suit tout de suite, sans demande', async () => {
    profile = { ...STRANGER };
    await renderScreen();
    expect(screen.getByText('Listes masquées')).toBeTruthy();
    expect(screen.getByText('Suis @lea.m pour voir ses listes')).toBeTruthy();
    await fireEvent.press(screen.getByText('Suivre'));
    expect(await screen.findByText('Suivi')).toBeTruthy();
    expect(screen.queryByText('Listes masquées')).toBeNull();
    expect(useUiStore.getState().toast?.message).toBe('Tu suis @lea.m');
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/follow', { method: 'POST' });
  });

  it('pas suivie : le compteur d’abonnements affiche un toast', async () => {
    profile = { ...STRANGER };
    await renderScreen();
    await fireEvent.press(screen.getByLabelText('5 abonnements'));
    expect(useUiStore.getState().toast?.message).toBe('Suis ce membre pour voir ses listes');
  });

  it('liste d’un membre suivi en lecture seule : ni « + » ni coche, la fiche reste ouvrable', async () => {
    await renderScreen();
    expect(await screen.findByLabelText("L'Odyssée")).toBeTruthy();
    expect(screen.queryByLabelText("Ajouter L'Odyssée")).toBeNull();
    expect(screen.queryByLabelText('Retirer Dune : Deuxième partie')).toBeNull();
    expect(toggleInList).not.toHaveBeenCalled();
  });

  it('hors ligne : le bouton ne change pas, « Connexion requise »', async () => {
    profile = { ...STRANGER };
    await renderScreen();
    onlineManager.setOnline(false);
    await fireEvent.press(screen.getByText('Suivre'));
    expect(screen.getByText('Suivre')).toBeTruthy();
    expect(useUiStore.getState().toast?.message).toBe('Connexion requise');
  });

  it('« Suivi » → « Ne plus suivre » → toast avec « Annuler » qui rétablit le suivi', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Suivi'));
    useUiStore.getState().actionSheet?.options[0]?.onPress();
    expect(await screen.findByText('Suivre')).toBeTruthy();
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe('Tu ne suis plus @lea.m'),
    );

    useUiStore.getState().undoToast();
    expect(await screen.findByText('Suivi')).toBeTruthy();
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/users/lea.m/follow', { method: 'POST' }),
    );
  });

  it('profil introuvable : message et « Retour »', async () => {
    const { ApiError } = jest.requireMock<{ ApiError: new (code: number) => Error }>('@/api/http');
    mockApi.mockImplementation(async () => {
      throw new ApiError(404);
    });
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <QueryClientProvider client={queryClient}>
          <UserProfileScreen username="lea.m" />
        </QueryClientProvider>
      </SafeAreaProvider>,
    );
    expect(await screen.findByText("Ce profil n'existe pas ou n'est plus disponible")).toBeTruthy();
    expect(screen.getByText('Retour')).toBeTruthy();
  });
});
