import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { queryClient } from '@/api/queryClient';
import { signOut } from '@/api/session';
import { ensureNotificationPermission } from '@/lib/notifications';
import { useUiStore } from '@/store/ui';

import { MyProfileScreen } from '../../social/MyProfileScreen';

jest.mock('@/api/http', () => ({ api: jest.fn() }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
}));
// Le client de l'app garde ses requêtes 7 jours : ses minuteurs empêcheraient Jest de finir.
jest.mock('@/api/queryClient', () => {
  const { QueryClient } =
    jest.requireActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    queryClient: new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity, retry: false } },
    }),
  };
});
jest.mock('@/api/session', () => ({ signOut: jest.fn() }));
jest.mock('@/lib/notifications', () => ({
  ensureNotificationPermission: jest.fn(),
  unregisterPushToken: jest.fn(),
}));
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true }),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

const mockApi = api as jest.MockedFunction<typeof api>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockPermission = ensureNotificationPermission as jest.MockedFunction<
  typeof ensureNotificationPermission
>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const PROFILE = {
  username: 'dim.k',
  displayName: 'Dim',
  friendsCount: 2,
  followRequestsCount: 0,
  email: 'dim@exemple.ca',
  authProvider: 'apple',
  language: 'fr-CA',
  spoilerProtection: false,
  providerIds: [8, 230],
  notificationPrefs: {
    episodes: true,
    cinema: false,
    streaming: true,
    seasons: true,
    digestHour: 9,
  },
};

const PROVIDERS = [
  { id: 8, name: 'Netflix', shortName: 'N' },
  { id: 337, name: 'Disney Plus', shortName: 'D+' },
  { id: 230, name: 'Crave', shortName: 'C' },
];

let profile: Record<string, unknown> = PROFILE;
let blocked: unknown[] = [];

function route(path: string): unknown {
  if (path === '/me/profile') return profile;
  if (path === '/me/blocks') return blocked;
  if (path === '/providers') return PROVIDERS;
  return undefined;
}

// Le client de l'app : les actions du profil lisent et écrivent son cache.
async function renderProfile() {
  queryClient.clear();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>
        <MyProfileScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText('Français');
}

function pressDialogAction(label: string) {
  useUiStore
    .getState()
    .dialog?.actions.find((a) => a.label === label)
    ?.onPress?.();
}

beforeEach(async () => {
  jest.clearAllMocks();
  profile = PROFILE;
  blocked = [];
  mockApi.mockImplementation(async (path) => route(path));
  await act(() => useUiStore.setState({ dialog: null, dialogOpen: false }));
});

describe('onglet Profil', () => {
  it('moi, « Mes amis · 2 », puis les réglages, sans « Modifier le profil »', async () => {
    await renderProfile();
    expect(screen.getByText('Profil')).toBeTruthy();
    expect(screen.getByText('Dim')).toBeTruthy();
    expect(screen.getByText('@dim.k')).toBeTruthy();
    expect(screen.getByLabelText('Mes amis, 2')).toBeTruthy();
    // Aucune demande : pas de ligne « Demandes d'amis ».
    expect(screen.queryByLabelText(/^Demandes d'amis, /)).toBeNull();
    expect(screen.queryByText('Modifier le profil')).toBeNull();
    expect(screen.queryByText(/abonn/)).toBeNull();
    expect(screen.queryByText('dim@exemple.ca · Apple')).toBeNull();
    expect(screen.getByText('Français')).toBeTruthy();
    expect(await screen.findByText('Netflix, Crave')).toBeTruthy();
    expect(screen.getByText('9 h')).toBeTruthy();
    expect(screen.getByText('Version 1.0.0')).toBeTruthy();
    expect(screen.getByLabelText('TMDB')).toBeTruthy();
    expect(screen.getByLabelText('JustWatch')).toBeTruthy();
  });

  it('« Mes amis » ouvre ma liste d’amis', async () => {
    await renderProfile();
    await fireEvent.press(screen.getByLabelText('Mes amis, 2'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/u/[username]/friends',
      params: { username: 'dim.k' },
    });
  });

  it('demandes reçues : ligne « Demandes d’amis » avec leur nombre', async () => {
    profile = { ...PROFILE, followRequestsCount: 3 };
    await renderProfile();
    await fireEvent.press(screen.getByLabelText("Demandes d'amis, 3"));
    expect(router.push).toHaveBeenCalledWith('/follow-requests');
  });

  it('« + » : chercher un membre ou inviter', async () => {
    await renderProfile();
    await fireEvent.press(screen.getByLabelText('Ajouter un ami'));
    const sheet = useUiStore.getState().actionSheet;
    expect(sheet?.title).toBe('Ajouter un ami');
    expect(sheet?.options.map((option) => option.label)).toEqual(['Chercher un membre', 'Inviter']);
    await act(() => sheet?.options[0]?.onPress());
    expect(router.push).toHaveBeenCalledWith({ pathname: '/search', params: { tab: 'members' } });
  });

  it('activer une notification sans permission : rien n’est enregistré', async () => {
    mockPermission.mockResolvedValue(false);
    await renderProfile();
    await fireEvent.press(screen.getByLabelText('Sorties en salle'));
    await waitFor(() => expect(mockPermission).toHaveBeenCalled());
    expect(mockApi).not.toHaveBeenCalledWith(
      '/me/profile',
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('activer une notification avec permission : enregistrée', async () => {
    mockPermission.mockResolvedValue(true);
    await renderProfile();
    await fireEvent.press(screen.getByLabelText('Sorties en salle'));
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/me/profile', {
        method: 'PUT',
        body: { notificationPrefs: { cinema: true } },
      }),
    );
  });

  it('couper une notification ne demande pas la permission', async () => {
    await renderProfile();
    await fireEvent.press(screen.getByLabelText('Nouveaux épisodes'));
    expect(mockPermission).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/me/profile', {
        method: 'PUT',
        body: { notificationPrefs: { episodes: false } },
      }),
    );
  });

  it('déconnexion et suppression : dialogues de la spec', async () => {
    await renderProfile();
    await fireEvent.press(screen.getByText('Se déconnecter'));
    expect(useUiStore.getState().dialog).toMatchObject({
      title: 'Se déconnecter ?',
      body: 'Ta liste reste sauvegardée sur ton compte.',
    });
    await fireEvent.press(screen.getByText('Supprimer mon compte'));
    expect(useUiStore.getState().dialog).toMatchObject({
      title: 'Supprimer ton compte ?',
      body: "Ta liste, ton suivi d'épisodes et tes réglages seront effacés définitivement.",
    });
  });

  it('« Supprimer » efface le compte puis la session', async () => {
    await renderProfile();
    await fireEvent.press(screen.getByText('Supprimer mon compte'));
    await act(() => pressDialogAction('Supprimer'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    expect(mockApi).toHaveBeenCalledWith('/me', { method: 'DELETE' });
    expect(useUiStore.getState().toast).toBeNull();
  });

  it('« Supprimer » en échec : toast, la session reste ouverte', async () => {
    mockApi.mockImplementation(async (path, init) => {
      if (path === '/me' && init?.method === 'DELETE') throw new Error('réseau');
      return route(path);
    });
    await renderProfile();
    await fireEvent.press(screen.getByText('Supprimer mon compte'));
    await act(() => pressDialogAction('Supprimer'));
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe("Impossible d'enregistrer, réessaie"),
    );
    expect(mockSignOut).not.toHaveBeenCalled();
    await act(() => useUiStore.getState().hideToast());
  });

  it('pas de « Aucune » pendant le chargement des plateformes', async () => {
    let resolveProviders: (value: unknown) => void = () => undefined;
    mockApi.mockImplementation((path) =>
      path === '/providers'
        ? new Promise((resolve) => (resolveProviders = resolve))
        : Promise.resolve(route(path)),
    );
    await renderProfile();
    expect(screen.queryByText('Aucune')).toBeNull();
    await act(async () => resolveProviders(PROVIDERS));
    expect(await screen.findByText('Netflix, Crave')).toBeTruthy();
  });

  it('Mes plateformes ouvre la sheet', async () => {
    await renderProfile();
    await fireEvent.press(screen.getByLabelText('Mes plateformes'));
    expect(await screen.findByText('OK')).toBeTruthy();
    expect(screen.getByLabelText('Disney Plus')).toBeTruthy();
  });

  it('notifications sociales : « Demandes d’amis » seulement', async () => {
    await renderProfile();
    expect(screen.queryByLabelText('Nouvel abonné')).toBeNull();
    await fireEvent.press(screen.getByLabelText("Demandes d'amis"));
    expect(mockPermission).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/me/profile', {
        method: 'PUT',
        body: { notificationPrefs: { followRequests: false } },
      }),
    );
  });

  it('confidentialité : comptes bloqués « Aucun », puis leur nombre ; la ligne ouvre l’écran', async () => {
    await renderProfile();
    expect(await screen.findByText('Aucun')).toBeTruthy();
    // Plus de profil public ni privé : seuls les amis voient listes et activité.
    expect(screen.queryByLabelText('Profil privé')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Comptes bloqués'));
    expect(router.push).toHaveBeenCalledWith('/settings/blocked');

    blocked = [{ username: 'x.y', displayName: 'X', followState: 'blocked' }];
    await act(() => queryClient.invalidateQueries({ queryKey: ['blocks'] }));
    expect(await screen.findByText('1')).toBeTruthy();
  });

  it('anti-spoiler : son propre groupe, « Protection anti-spoiler »', async () => {
    await renderProfile();
    expect(screen.getByText('Anti-spoiler')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Protection anti-spoiler'));
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/me/profile', {
        method: 'PUT',
        body: { spoilerProtection: true },
      }),
    );
  });
});
