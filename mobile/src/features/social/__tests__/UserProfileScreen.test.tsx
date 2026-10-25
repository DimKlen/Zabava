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

/** Amie : listes visibles. */
const LEA = {
  username: 'lea.m',
  displayName: 'Léa Martin',
  followState: 'following',
  followsMe: true,
  commonCount: 8,
  friendsCount: 5,
  canSeeLists: true,
  isMe: false,
};

/** Pas encore amis : en-tête seulement. */
const STRANGER = {
  ...LEA,
  followState: 'none',
  followsMe: false,
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
      return { status: profile.followState === 'none' ? 'pending' : 'accepted' };
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
  it('ami : en-tête, « 5 amis », titres en commun, bouton « Amis »', async () => {
    await renderScreen();
    expect(screen.getByText('@lea.m')).toBeTruthy();
    expect(screen.getByLabelText('5 amis')).toBeTruthy();
    expect(screen.getByText('8 titres en commun')).toBeTruthy();
    expect(screen.getByText('Amis')).toBeTruthy();
    expect(screen.queryByText('Te suit')).toBeNull();
    expect(mockApi).toHaveBeenCalledWith('/me/recent-profiles/lea.m', { method: 'POST' });
  });

  it('pas encore amis : « Réservé à ses amis », « Ajouter en ami » envoie une demande', async () => {
    profile = { ...STRANGER };
    await renderScreen();
    expect(screen.getByText('Réservé à ses amis')).toBeTruthy();
    expect(screen.getByText('Ajoute @lea.m en ami pour voir ses listes')).toBeTruthy();
    await fireEvent.press(screen.getByText('Ajouter en ami'));
    expect(await screen.findByText('Demande envoyée')).toBeTruthy();
    expect(useUiStore.getState().toast?.message).toBe('Demande envoyée à @lea.m');
    expect(screen.getByText('Réservé à ses amis')).toBeTruthy();
  });

  it('sa demande reçue : « Accepter » rend amis tout de suite, compteur à jour', async () => {
    profile = { ...STRANGER, followState: 'requested' };
    await renderScreen();
    await fireEvent.press(screen.getByText('Accepter'));
    expect(await screen.findByText('Amis')).toBeTruthy();
    expect(await screen.findByLabelText('6 amis')).toBeTruthy();
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe('Léa et toi êtes maintenant amis'),
    );
  });

  it('pas encore amis : le compteur d’amis affiche un toast', async () => {
    profile = { ...STRANGER };
    await renderScreen();
    await fireEvent.press(screen.getByLabelText('5 amis'));
    expect(useUiStore.getState().toast?.message).toBe('Réservé à ses amis');
  });

  it('les affiches portent ma coche si le titre est dans ma liste ; le « + » l’ajoute', async () => {
    await renderScreen();
    expect(await screen.findByLabelText('Retirer Dune : Deuxième partie')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Ajouter L'Odyssée"));
    expect(toggleInList).toHaveBeenCalledWith(expect.objectContaining({ id: ODYSSEY.id }));
  });

  it('hors ligne : le bouton ne change pas, « Connexion requise »', async () => {
    profile = { ...STRANGER };
    await renderScreen();
    onlineManager.setOnline(false);
    await fireEvent.press(screen.getByText('Ajouter en ami'));
    expect(screen.getByText('Ajouter en ami')).toBeTruthy();
    expect(useUiStore.getState().toast?.message).toBe('Connexion requise');
  });

  it('« Amis » → « Retirer de mes amis » → toast avec « Annuler » qui rétablit l’amitié', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Amis'));
    useUiStore.getState().actionSheet?.options[0]?.onPress();
    expect(await screen.findByText('Ajouter en ami')).toBeTruthy();
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe('@lea.m ne fait plus partie de tes amis'),
    );

    useUiStore.getState().undoToast();
    expect(await screen.findByText('Amis')).toBeTruthy();
    await waitFor(() =>
      expect(mockApi).toHaveBeenLastCalledWith('/users/lea.m/follow', { method: 'POST' }),
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
