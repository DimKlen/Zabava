import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { profileKey } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { watchlistKey } from '@/api/watchlist';
import { useUiStore } from '@/store/ui';

import { ConnectionsScreen } from '../ConnectionsScreen';
import { EditProfileScreen, nextUsernameChange } from '../EditProfileScreen';
import { MyProfileScreen } from '../MyProfileScreen';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    canGoBack: () => true,
  },
  useNavigation: () => ({ dispatch: jest.fn() }),
}));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
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
jest.mock('@/api/libraryActions', () => ({
  toggleInList: jest.fn(),
  withLibraryType: (title: unknown) => title,
}));
jest.mock('@/api/avatar', () => ({
  isUploadedAvatar: () => false,
  pickAndUploadAvatar: jest.fn(),
}));
jest.mock('@/api/session', () => {
  const { create } = jest.requireActual('zustand');
  return { useSessionStore: create(() => ({ status: 'signedIn', session: null })) };
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
  isPrivate: false,
  followersCount: 2,
  followingCount: 1,
  followRequestsCount: 0,
};

const movie = (id: number, title: string, status: string, addedAt: string, watchedAt?: string) => ({
  id: `movie-${id}`,
  tmdbId: id,
  title,
  availability: { sub: [], rent: [], buy: [] },
  userTitle: { titleId: `movie-${id}`, status, addedAt, watchedAt, notificationsEnabled: true },
});

const member = (username: string, displayName: string, extra: object = {}) => ({
  username,
  displayName,
  isPrivate: false,
  followState: 'none',
  followsMe: true,
  commonCount: 0,
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  onlineManager.setOnline(true);
  queryClient.setQueryData(profileKey, ME);
  queryClient.setQueryData(watchlistKey('movie'), [
    movie(1, 'Dune', 'watched', '2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'),
    movie(2, 'Oppenheimer', 'towatch', '2026-09-05T00:00:00Z'),
  ]);
  queryClient.setQueryData(watchlistKey('tv'), []);
  queryClient.setQueryData(watchlistKey('anime'), []);
});

afterEach(() => {
  useUiStore.getState().hideToast();
  useUiStore.setState({ inviteOpen: false });
});

async function show(element: ReactElement) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('MyProfileScreen', () => {
  it('en-tête, Films › Vus par défaut, depuis Ma liste', async () => {
    await show(<MyProfileScreen />);
    expect(screen.getByText('Dim Kovac')).toBeTruthy();
    expect(screen.getByText('@dim.k')).toBeTruthy();
    expect(screen.getByText('abonnés')).toBeTruthy();
    expect(screen.getByText('abonnement')).toBeTruthy();
    expect(await screen.findByLabelText('Dune')).toBeTruthy();
    expect(screen.queryByLabelText('Oppenheimer')).toBeNull();

    await fireEvent.press(screen.getByText('À voir'));
    expect(await screen.findByLabelText('Oppenheimer')).toBeTruthy();
  });

  it('onglet vide : « Rien ici pour l’instant »', async () => {
    await show(<MyProfileScreen />);
    await fireEvent.press(screen.getByText('Séries'));
    expect(await screen.findByText("Rien ici pour l'instant")).toBeTruthy();
  });

  it('engrenage → Réglages, « Modifier le profil », compteurs → abonnés', async () => {
    await show(<MyProfileScreen />);
    await fireEvent.press(screen.getByLabelText('Réglages'));
    expect(router.push).toHaveBeenCalledWith('/settings');
    await fireEvent.press(screen.getByText('Modifier le profil'));
    expect(router.push).toHaveBeenCalledWith('/profile/edit');
    await fireEvent.press(screen.getByLabelText('2 abonnés'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/u/[username]/connections',
      params: { username: 'dim.k', tab: 'followers' },
    });
  });
});

describe('MyProfileScreen › Inviter', () => {
  it('l’icône personne + et le bouton « Inviter » ouvrent la sheet Inviter', async () => {
    await show(<MyProfileScreen />);
    const [icon, button] = screen.getAllByLabelText('Inviter');
    expect(screen.getByText('Inviter')).toBeTruthy();
    for (const target of [icon!, button!]) {
      useUiStore.setState({ inviteOpen: false });
      await fireEvent.press(target);
      expect(useUiStore.getState().inviteOpen).toBe(true);
    }
  });
});

describe('ConnectionsScreen', () => {
  beforeEach(() => {
    mockApi.mockImplementation(async (path) => {
      if (path === '/users/dim.k')
        return { ...ME, isMe: true, canSeeLists: true, followState: 'none' };
      if (path === '/users/dim.k/followers') {
        return {
          items: [
            member('lea.m', 'Léa Martin', { commonCount: 4 }),
            member('max.dubois', 'Max Dubois'),
          ],
        };
      }
      if (path === '/users/dim.k/following') return { items: [] };
      return undefined;
    });
  });

  it('filtre local sans accents ni casse ; titres en commun à partir de 3', async () => {
    await show(<ConnectionsScreen username="dim.k" initialTab="followers" />);
    expect(await screen.findByText('Léa Martin')).toBeTruthy();
    expect(screen.getByText('@lea.m · 4 titres en commun')).toBeTruthy();
    expect(screen.getByText('@max.dubois')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Filtrer'), 'LEA');
    expect(screen.queryByText('Max Dubois')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Filtrer'), 'zzz');
    expect(screen.getByText('Aucun membre ne correspond')).toBeTruthy();
  });

  it('mes abonnés : « … » → « Retirer cet abonné »', async () => {
    await show(<ConnectionsScreen username="dim.k" initialTab="followers" />);
    await fireEvent.press(await screen.findByLabelText('Options pour @lea.m'));
    const sheet = useUiStore.getState().actionSheet;
    expect(sheet?.options.map((option) => option.label)).toEqual(['Retirer cet abonné']);
    sheet?.options[0]?.onPress();
    await waitFor(() => expect(screen.queryByText('Léa Martin')).toBeNull());
    expect(mockApi).toHaveBeenCalledWith('/me/followers/lea.m', { method: 'DELETE' });
  });

  it('mes abonnés vides : « Personne ne te suit encore » + « Inviter »', async () => {
    mockApi.mockImplementation(async (path) => {
      if (path === '/users/dim.k')
        return { ...ME, isMe: true, canSeeLists: true, followState: 'none' };
      return { items: [] };
    });
    await show(<ConnectionsScreen username="dim.k" initialTab="followers" />);
    expect(await screen.findByText('Personne ne te suit encore')).toBeTruthy();
    await fireEvent.press(screen.getByText('Inviter'));
    expect(useUiStore.getState().inviteOpen).toBe(true);
  });

  it('mes abonnements vides : « Tu ne suis personne pour l’instant » + « Trouver des membres »', async () => {
    await show(<ConnectionsScreen username="dim.k" initialTab="following" />);
    expect(await screen.findByText("Tu ne suis personne pour l'instant")).toBeTruthy();
    expect(screen.getByText('Trouver des membres')).toBeTruthy();
  });
});

describe('EditProfileScreen', () => {
  it('pseudo modifiable une fois tous les 30 jours', () => {
    const now = new Date('2026-10-23T12:00:00Z');
    expect(nextUsernameChange(undefined, now)).toBeNull();
    expect(nextUsernameChange('2026-09-01T12:00:00Z', now)).toBeNull();
    expect(nextUsernameChange('2026-10-20T12:00:00Z', now)).toBe(
      'Tu pourras changer de pseudo à partir du 19 novembre',
    );
  });

  it('enregistrer : seules les modifications partent, retour et « Profil mis à jour »', async () => {
    mockApi.mockImplementation(async (path, options) =>
      path === '/me/profile' && options?.method === 'PUT'
        ? { ...ME, ...(options.body as object) }
        : undefined,
    );
    await show(<EditProfileScreen />);
    expect(
      screen.getByText(
        "Modifiable une fois tous les 30 jours. L'ancien pseudo reste réservé 30 jours.",
      ),
    ).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Nom affiché'), 'Dimitri');
    await fireEvent.press(screen.getByText('Enregistrer'));
    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mockApi).toHaveBeenCalledWith('/me/profile', {
      method: 'PUT',
      body: { displayName: 'Dimitri' },
    });
    expect(useUiStore.getState().toast?.message).toBe('Profil mis à jour');
  });

  it('passer de privé à public : « 1 demande acceptée automatiquement »', async () => {
    queryClient.setQueryData(profileKey, { ...ME, isPrivate: true, followRequestsCount: 1 });
    mockApi.mockImplementation(async (path, options) =>
      path === '/me/profile' && options?.method === 'PUT'
        ? { ...ME, ...(options.body as object) }
        : undefined,
    );
    await show(<EditProfileScreen />);
    await fireEvent.press(screen.getByLabelText('Profil privé'));
    await fireEvent.press(screen.getByText('Enregistrer'));
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe('1 demande acceptée automatiquement'),
    );
  });

  it('hors ligne : « Connexion requise », rien n’est envoyé', async () => {
    await show(<EditProfileScreen />);
    await fireEvent.changeText(screen.getByLabelText('Nom affiché'), 'Dimitri');
    onlineManager.setOnline(false);
    await fireEvent.press(screen.getByText('Enregistrer'));
    expect(useUiStore.getState().toast?.message).toBe('Connexion requise');
    expect(mockApi).not.toHaveBeenCalledWith('/me/profile', expect.anything());
  });
});
