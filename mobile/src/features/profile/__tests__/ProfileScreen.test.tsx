import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { queryClient } from '@/api/queryClient';
import { ensureNotificationPermission } from '@/lib/notifications';
import { useUiStore } from '@/store/ui';

import { ProfileScreen } from '../ProfileScreen';

jest.mock('@/api/http', () => ({ api: jest.fn() }));
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
const mockPermission = ensureNotificationPermission as jest.MockedFunction<
  typeof ensureNotificationPermission
>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const PROFILE = {
  displayName: 'Dim',
  email: 'dim@exemple.ca',
  authProvider: 'apple',
  region: 'CA',
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

function route(path: string): unknown {
  if (path === '/me/profile') return PROFILE;
  if (path === '/providers') return PROVIDERS;
  return undefined;
}

// Le client de l'app : les actions du profil lisent et écrivent son cache.
async function renderProfile() {
  queryClient.clear();
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>
        <ProfileScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText('Dim');
}

beforeEach(async () => {
  jest.clearAllMocks();
  mockApi.mockImplementation(async (path) => route(path));
  await act(() => useUiStore.setState({ dialog: null, dialogOpen: false }));
});

describe('ProfileScreen', () => {
  it('compte, préférences et à propos', async () => {
    await renderProfile();
    expect(screen.getByText('dim@exemple.ca · Apple')).toBeTruthy();
    expect(screen.getByText('Canada')).toBeTruthy();
    expect(screen.getByText('Français (fr-CA)')).toBeTruthy();
    expect(await screen.findByText('Netflix, Crave')).toBeTruthy();
    expect(screen.getByText('9 h')).toBeTruthy();
    expect(screen.getByText('Version 1.0.0')).toBeTruthy();
    expect(screen.getByLabelText('TMDB')).toBeTruthy();
    expect(screen.getByLabelText('JustWatch')).toBeTruthy();
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
});
