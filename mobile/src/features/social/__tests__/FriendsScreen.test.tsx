import { onlineManager, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { profileKey } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { useUiStore } from '@/store/ui';

import { FriendsScreen } from '../FriendsScreen';

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

const ME = { id: 'u1', username: 'dim.k', displayName: 'Dim Kovac', friendsCount: 2 };

const member = (username: string, displayName: string, extra: object = {}) => ({
  username,
  displayName,
  followState: 'following',
  commonCount: 0,
  ...extra,
});

let friends: object[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  onlineManager.setOnline(true);
  queryClient.setQueryData(profileKey, ME);
  friends = [member('lea.m', 'Léa Martin', { commonCount: 4 }), member('max.dubois', 'Max Dubois')];
  mockApi.mockImplementation(async (path) => {
    if (path === '/users/dim.k')
      return { ...ME, isMe: true, canSeeLists: true, followState: 'none' };
    if (path === '/users/lea.m') {
      return { ...member('lea.m', 'Léa Martin'), friendsCount: 1, canSeeLists: true, isMe: false };
    }
    if (path.endsWith('/friends')) return { items: friends };
    return undefined;
  });
});

afterEach(() => {
  useUiStore.getState().hideToast();
  useUiStore.setState({ inviteOpen: false });
});

async function show(username: string) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>
        <FriendsScreen username={username} />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('FriendsScreen', () => {
  it('« Mes abonnements » : filtre local sans accents ni casse ; titres en commun à partir de 3', async () => {
    await show('dim.k');
    expect(screen.getByText('Mes abonnements')).toBeTruthy();
    expect(await screen.findByText('Léa Martin')).toBeTruthy();
    expect(screen.getByText('@lea.m · 4 titres en commun')).toBeTruthy();
    expect(screen.getByText('@max.dubois')).toBeTruthy();
    expect(screen.getAllByText('Suivi')).toHaveLength(2);

    await fireEvent.changeText(screen.getByLabelText('Filtrer'), 'LEA');
    expect(screen.queryByText('Max Dubois')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Filtrer'), 'zzz');
    expect(screen.getByText('Aucun membre ne correspond')).toBeTruthy();
  });

  it('mes abonnements : pas de « … » ; « Suivi » → « Ne plus suivre »', async () => {
    await show('dim.k');
    await fireEvent.press(
      await screen.findByLabelText('Tu suis @lea.m, toucher pour ne plus suivre'),
    );
    expect(screen.queryByLabelText('Options pour @lea.m')).toBeNull();
    const sheet = useUiStore.getState().actionSheet;
    expect(sheet?.options.map((option) => option.label)).toEqual(['Ne plus suivre']);
    sheet?.options[0]?.onPress();
    await waitFor(() => expect(screen.queryByText('Léa Martin')).toBeNull());
    expect(mockApi).toHaveBeenCalledWith('/users/lea.m/follow', { method: 'DELETE' });
    expect(useUiStore.getState().toast?.message).toBe('Tu ne suis plus @lea.m');
  });

  it('aucun abonnement : « Tu ne suis personne pour l’instant » + « Suivre quelqu’un »', async () => {
    friends = [];
    await show('dim.k');
    expect(await screen.findByText("Tu ne suis personne pour l'instant")).toBeTruthy();
    await fireEvent.press(screen.getByText("Suivre quelqu'un"));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/search', params: { tab: 'members' } });
  });

  it('abonnements d’un membre : « Abonnements de Léa », sans menu', async () => {
    friends = [member('max.dubois', 'Max Dubois', { followState: 'none' })];
    await show('lea.m');
    expect(await screen.findByText('Abonnements de Léa')).toBeTruthy();
    expect(await screen.findByText('Max Dubois')).toBeTruthy();
    expect(screen.queryByLabelText('Options pour @max.dubois')).toBeNull();
    expect(screen.getByLabelText('Suivre @max.dubois')).toBeTruthy();
  });
});
