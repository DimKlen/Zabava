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

const LEA = {
  username: 'lea.m',
  displayName: 'Léa Martin',
  isPrivate: false,
  followState: 'none',
  followsMe: true,
  commonCount: 8,
  followersCount: 5,
  followingCount: 1,
  canSeeLists: true,
  isMe: false,
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
  queryClient.setQueryData(profileKey, { username: 'dim.k', followersCount: 1, followingCount: 2 });
  // Ma liste : Dune y est, L'Odyssée non.
  queryClient.setQueryData(watchlistKey('movie'), [{ id: DUNE.id, tmdbId: DUNE.tmdbId }]);
  queryClient.setQueryData(watchlistKey('tv'), []);
  queryClient.setQueryData(watchlistKey('anime'), []);
  mockApi.mockImplementation(async (path, options) => {
    if (path === '/users/lea.m') return profile;
    if (path === '/users/lea.m/titles') return { items: [{ title: DUNE }, { title: ODYSSEY }] };
    if (path === '/me/recent-profiles/lea.m') return [];
    if (path === '/users/lea.m/follow' && options?.method === 'POST') {
      return { status: profile.isPrivate ? 'pending' : 'accepted' };
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
  it('en-tête complet : « Te suit », compteurs, titres en commun, bouton « Suivre en retour »', async () => {
    await renderScreen();
    expect(screen.getByText('@lea.m')).toBeTruthy();
    expect(screen.getByText('Te suit')).toBeTruthy();
    expect(screen.getByText('abonnés')).toBeTruthy();
    expect(screen.getByText('abonnement')).toBeTruthy();
    expect(screen.getByText('8 titres en commun')).toBeTruthy();
    expect(screen.getByText('Suivre en retour')).toBeTruthy();
    expect(mockApi).toHaveBeenCalledWith('/me/recent-profiles/lea.m', { method: 'POST' });
  });

  it('suivre un profil public : « Abonné » tout de suite et compteur à jour', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByText('Suivre en retour'));
    expect(await screen.findByText('Abonné')).toBeTruthy();
    expect(await screen.findByText('6')).toBeTruthy();
  });

  it('suivre un profil privé : « Demandé » et toast, listes toujours verrouillées', async () => {
    profile = { ...LEA, isPrivate: true, canSeeLists: false };
    await renderScreen();
    expect(screen.getByText('Ce profil est privé')).toBeTruthy();
    expect(screen.getByText('Suis @lea.m pour voir ses listes')).toBeTruthy();
    await fireEvent.press(screen.getByText('Suivre en retour'));
    expect(await screen.findByText('Demandé')).toBeTruthy();
    expect(useUiStore.getState().toast?.message).toBe('Demande envoyée à @lea.m');
    expect(screen.getByText('Ce profil est privé')).toBeTruthy();
  });

  it('profil privé non suivi : les compteurs affichent un toast', async () => {
    profile = { ...LEA, isPrivate: true, canSeeLists: false };
    await renderScreen();
    await fireEvent.press(screen.getByLabelText('5 abonnés'));
    expect(useUiStore.getState().toast?.message).toBe('Ce profil est privé');
  });

  it('les affiches portent ma coche si le titre est dans ma liste ; le « + » l’ajoute', async () => {
    await renderScreen();
    expect(await screen.findByLabelText('Retirer Dune : Deuxième partie')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText("Ajouter L'Odyssée"));
    expect(toggleInList).toHaveBeenCalledWith(expect.objectContaining({ id: ODYSSEY.id }));
  });

  it('hors ligne : le bouton ne change pas, « Connexion requise »', async () => {
    await renderScreen();
    onlineManager.setOnline(false);
    await fireEvent.press(screen.getByText('Suivre en retour'));
    expect(screen.getByText('Suivre en retour')).toBeTruthy();
    expect(useUiStore.getState().toast?.message).toBe('Connexion requise');
  });

  it('« Abonné » → « Se désabonner » → toast avec « Annuler » qui rétablit l’abonnement', async () => {
    profile = { ...LEA, followState: 'following', followersCount: 6 };
    await renderScreen();
    await fireEvent.press(screen.getByText('Abonné'));
    useUiStore.getState().actionSheet?.options[0]?.onPress();
    expect(await screen.findByText('Suivre en retour')).toBeTruthy();
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe('Tu ne suis plus @lea.m'),
    );

    useUiStore.getState().undoToast();
    expect(await screen.findByText('Abonné')).toBeTruthy();
    await waitFor(() =>
      expect(mockApi).toHaveBeenLastCalledWith('/users/lea.m/follow', { method: 'POST' }),
    );
  });

  it('profil bloqué par moi : « Débloquer » et pas de listes', async () => {
    profile = { ...LEA, followState: 'blocked', followsMe: false, canSeeLists: false };
    await renderScreen();
    expect(screen.getByText('Débloquer')).toBeTruthy();
    expect(screen.getByText('Tu as bloqué ce profil')).toBeTruthy();
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
