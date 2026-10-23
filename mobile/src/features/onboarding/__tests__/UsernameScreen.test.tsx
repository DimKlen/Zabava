import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api, ApiError } from '@/api/http';
import { queryClient } from '@/api/queryClient';
import { useUiStore } from '@/store/ui';

import { UsernameScreen } from '../UsernameScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));
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

const mockApi = api as jest.MockedFunction<typeof api>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Pseudos déjà pris dans la base simulée. */
const TAKEN = new Set(['dim.k', 'lea.m']);
let profile: Record<string, unknown>;

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  profile = { displayName: 'Dim Kovac', email: 'dim@exemple.ca' };
  mockApi.mockImplementation(async (path, options) => {
    if (path === '/me/profile' && options?.method === 'PUT')
      return { ...profile, ...(options.body as object) };
    if (path === '/me/profile') return profile;
    if (path === '/users/username-available') {
      const u = String(options?.query?.u);
      return TAKEN.has(u)
        ? { available: false, reason: 'taken', suggestions: [`${u}.tv`, `${u}_26`, `${u}.zab`] }
        : { available: true, suggestions: [] };
    }
    throw new Error(`Route non simulée : ${path}`);
  });
});

async function renderScreen(variant: 'onboarding' | 'required' = 'onboarding') {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>
        <UsernameScreen variant={variant} />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText('Choisis ton pseudo');
}

const field = () => screen.getByLabelText('Pseudo');
const continueButton = () => screen.getByRole('button', { name: 'Continuer' });

describe('UsernameScreen', () => {
  it('propose un pseudo libre à partir du nom', async () => {
    profile = { displayName: 'Léa Martin' };
    TAKEN.delete('lea.m');
    await renderScreen();
    expect(field().props.value).toBe('lea.m');
    expect(await screen.findByText('Disponible')).toBeTruthy();
    TAKEN.add('lea.m');
  });

  it('remplace une proposition déjà prise par la première proposition libre', async () => {
    await renderScreen();
    await waitFor(() => expect(field().props.value).toBe('dim.k.tv'));
    expect(await screen.findByText('Disponible')).toBeTruthy();
  });

  it('nettoie la saisie : « Éloïse » devient eloise', async () => {
    await renderScreen();
    await fireEvent.changeText(field(), 'Éloïse');
    expect(field().props.value).toBe('eloise');
  });

  it('pseudo pris : « Déjà pris » et 3 propositions, inactif tant que ce n’est pas libre', async () => {
    await renderScreen();
    await screen.findByText('Disponible');
    await fireEvent.changeText(field(), 'lea.m');
    expect(screen.getByText('Vérification…')).toBeTruthy();
    expect(continueButton()).toBeDisabled();

    expect(await screen.findByText('Déjà pris. Essaie plutôt :')).toBeTruthy();
    expect(screen.getByText('@lea.m.tv')).toBeTruthy();
    expect(screen.getByText('@lea.m_26')).toBeTruthy();
    expect(screen.getByText('@lea.m.zab')).toBeTruthy();
    expect(continueButton()).toBeDisabled();

    await fireEvent.press(screen.getByText('@lea.m_26'));
    expect(field().props.value).toBe('lea.m_26');
    await screen.findByText('Disponible');
    expect(continueButton()).toBeEnabled();
  });

  it('pseudo trop court : explication et bouton inactif', async () => {
    await renderScreen();
    await fireEvent.changeText(field(), 'di');
    expect(
      await screen.findByText(
        '3 à 20 caractères : lettres minuscules, chiffres, point et tiret bas.',
      ),
    ).toBeTruthy();
    expect(continueButton()).toBeDisabled();
  });

  it('pas de réseau : « Vérification impossible, réessaie »', async () => {
    await renderScreen();
    await screen.findByText('Disponible');
    mockApi.mockRejectedValueOnce(new TypeError('Network request failed'));
    await fireEvent.changeText(field(), 'eloise');
    expect(await screen.findByText('Vérification impossible, réessaie')).toBeTruthy();
    expect(continueButton()).toBeDisabled();
  });

  it('enregistre le pseudo et la visibilité, puis passe à la langue', async () => {
    await renderScreen();
    await screen.findByText('Disponible');
    await fireEvent.press(screen.getByLabelText('Profil privé'));
    await fireEvent.press(continueButton());
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/onboarding/region'));
    expect(mockApi).toHaveBeenCalledWith('/me/profile', {
      method: 'PUT',
      body: { username: 'dim.k.tv', isPrivate: true },
    });
  });

  it('pseudo pris entre-temps (409) : « Déjà pris » avec des propositions', async () => {
    await renderScreen();
    await screen.findByText('Disponible');
    mockApi.mockImplementationOnce(async () => {
      TAKEN.add('dim.k.tv');
      throw new ApiError(409, 'PUT /me/profile');
    });
    await fireEvent.press(continueButton());
    expect(await screen.findByText('Déjà pris. Essaie plutôt :')).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    TAKEN.delete('dim.k.tv');
  });

  it('autre échec : toast, et on reste sur l’étape', async () => {
    await renderScreen();
    await screen.findByText('Disponible');
    mockApi.mockRejectedValueOnce(new ApiError(500, 'PUT /me/profile'));
    await fireEvent.press(continueButton());
    await waitFor(() =>
      expect(useUiStore.getState().toast?.message).toBe("Impossible d'enregistrer, réessaie"),
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it('compte existant sans pseudo : retour à l’app une fois choisi', async () => {
    profile = { displayName: 'Dim Kovac', onboardedAt: '2026-10-01T00:00:00Z' };
    await renderScreen('required');
    await screen.findByText('Disponible');
    await fireEvent.press(continueButton());
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(tabs)/watchlist'));
  });

  it('revenir sur l’étape garde le pseudo enregistré, sans le renvoyer', async () => {
    profile = { displayName: 'Dim Kovac', username: 'dim.k' };
    await renderScreen();
    expect(field().props.value).toBe('dim.k');
    expect(screen.queryByText('Déjà pris. Essaie plutôt :')).toBeNull();
    expect(continueButton()).toBeEnabled();
    await fireEvent.press(continueButton());
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/onboarding/region'));
    expect(mockApi).toHaveBeenCalledWith('/me/profile', {
      method: 'PUT',
      body: { isPrivate: false },
    });
  });
});
