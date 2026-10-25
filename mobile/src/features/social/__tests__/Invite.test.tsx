import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { AppState, Linking, Share } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { profileKey } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { recentProfilesKey } from '@/api/social';
import { MemberResults } from '@/features/search/MemberResults';
import { hapticSuccess } from '@/lib/haptics';
import { openInviteSheet, useUiStore } from '@/store/ui';

import { InviteSheetHost } from '../InviteSheet';
import { ScanScreen } from '../ScanScreen';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useSegments: () => ['(tabs)', 'profile'],
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
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
// Modules natifs ou SVG : une vue garde leurs props.
jest.mock('react-native-qrcode-svg', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: (props: object) => <View testID="qr" {...props} /> };
});
jest.mock('expo-camera', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    CameraView: (props: object) => <View testID="camera" {...props} />,
    useCameraPermissions: jest.fn(),
  };
});
jest.mock('@/lib/haptics', () => ({ hapticSuccess: jest.fn() }));

const mockApi = api as jest.MockedFunction<typeof api>;
const mockPermissions = useCameraPermissions as jest.Mock;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const ME = { id: 'u1', username: 'dim.k', displayName: 'Dim Kovac' };

const member = (username: string, displayName: string) => ({
  username,
  displayName,
  followState: 'none',
  followsMe: false,
  commonCount: 0,
});

// Abonnements AppState (le mock de React Native ne renvoie pas d'abonnement).
let appStateListeners: ((state: string) => void)[] = [];

beforeEach(() => {
  jest.clearAllMocks();
  appStateListeners = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    appStateListeners.push(listener as (state: string) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  queryClient.clear();
  queryClient.setQueryData(profileKey, ME);
});

afterEach(async () => {
  await act(() => useUiStore.setState({ inviteOpen: false }));
  useUiStore.getState().hideToast();
});

async function show(element: ReactElement) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

describe('InviteSheetHost', () => {
  it('QR code du lien de profil, @pseudo et domaine', async () => {
    await show(<InviteSheetHost />);
    expect(screen.queryByText('Inviter')).toBeNull();
    await act(() => openInviteSheet());
    expect(await screen.findByText('Inviter')).toBeTruthy();
    expect(screen.getByText('@dim.k')).toBeTruthy();
    expect(screen.getByText('151-145-50-138.sslip.io/u/dim.k')).toBeTruthy();
    const qr = screen.getByTestId('qr');
    expect(qr.props.value).toBe('https://151-145-50-138.sslip.io/u/dim.k');
  });

  it('« Partager mon lien » ouvre le partage du système avec le message', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    await show(<InviteSheetHost />);
    await act(() => openInviteSheet());
    await fireEvent.press(await screen.findByText('Partager mon lien'));
    expect(share).toHaveBeenCalledWith({
      message: 'Suis-moi sur Zabava : https://151-145-50-138.sslip.io/u/dim.k',
    });
  });

  it('« Copier le lien » copie le lien et affiche « Lien copié »', async () => {
    await show(<InviteSheetHost />);
    await act(() => openInviteSheet());
    await fireEvent.press(await screen.findByText('Copier le lien'));
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      'https://151-145-50-138.sslip.io/u/dim.k',
    );
    // Visible au-dessus de la sheet (la Modal couvre le toast global).
    expect(await screen.findByText('Lien copié')).toBeTruthy();
  });

  it('« Scanner un code » ferme la sheet et ouvre le scanner', async () => {
    await show(<InviteSheetHost />);
    await act(() => openInviteSheet());
    await fireEvent.press(await screen.findByText('Scanner un code'));
    expect(useUiStore.getState().inviteOpen).toBe(false);
    expect(router.push).toHaveBeenCalledWith('/scan');
  });
});

describe('ScanScreen', () => {
  const scan = (data: string) =>
    act(() => screen.getByTestId('camera').props.onBarcodeScanned({ data }));

  it('première ouverture : demande la permission', async () => {
    const request = jest.fn(() => Promise.resolve());
    mockPermissions.mockReturnValue([{ status: 'undetermined', granted: false }, request]);
    await show(<ScanScreen />);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('permission refusée : explication et « Ouvrir les réglages »', async () => {
    const settings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    mockPermissions.mockReturnValue([{ status: 'denied', granted: false }, jest.fn()]);
    await show(<ScanScreen />);
    expect(screen.getByText("Autorise l'accès à la caméra pour scanner un code.")).toBeTruthy();
    await fireEvent.press(screen.getByText('Ouvrir les réglages'));
    expect(settings).toHaveBeenCalled();
  });

  it('retour au premier plan (depuis les réglages) : la permission est relue', async () => {
    const get = jest.fn(() => Promise.resolve());
    mockPermissions.mockReturnValue([{ status: 'denied', granted: false }, jest.fn(), get]);
    await show(<ScanScreen />);
    await act(() => appStateListeners.forEach((listener) => listener('active')));
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('code Zabava : vibration, fermeture et profil ouvert une seule fois', async () => {
    mockPermissions.mockReturnValue([{ status: 'granted', granted: true }, jest.fn()]);
    await show(<ScanScreen />);
    expect(screen.getByText("Vise le code Zabava d'un ami pour ouvrir son profil.")).toBeTruthy();
    await scan('https://151-145-50-138.sslip.io/u/Lea.M');
    await scan('https://151-145-50-138.sslip.io/u/Lea.M');
    expect(hapticSuccess).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/u/[username]',
      params: { username: 'lea.m' },
    });
  });

  it('autre code : toast une seule fois, le scanner reste ouvert', async () => {
    mockPermissions.mockReturnValue([{ status: 'granted', granted: true }, jest.fn()]);
    await show(<ScanScreen />);
    await scan('WIFI:S:maison;T:WPA;;');
    expect(useUiStore.getState().toast?.message).toBe("Ce code n'est pas un code Zabava");
    await act(() => useUiStore.getState().hideToast());
    await scan('WIFI:S:maison;T:WPA;;');
    expect(useUiStore.getState().toast).toBeNull();
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('MemberResults', () => {
  it('moins de 2 caractères : profils visités récemment, ou une aide', async () => {
    queryClient.setQueryData(recentProfilesKey, []);
    await show(<MemberResults query="l" typing={false} />);
    expect(screen.getByText('Tape au moins 2 caractères du pseudo ou du nom.')).toBeTruthy();
    await act(() =>
      queryClient.setQueryData(recentProfilesKey, [
        { username: 'lea.m', displayName: 'Léa Martin', followState: 'none' },
      ]),
    );
    expect(await screen.findByText('Profils consultés récemment')).toBeTruthy();
    expect(screen.getByText('Léa Martin')).toBeTruthy();
  });

  it('résultats par préfixe ; toucher une ligne ouvre le profil', async () => {
    mockApi.mockResolvedValue({ items: [member('lea.m', 'Léa Martin')] });
    await show(<MemberResults query="lea" typing={false} />);
    await fireEvent.press(await screen.findByText('Léa Martin'));
    expect(mockApi).toHaveBeenCalledWith(
      '/users/search',
      expect.objectContaining({
        query: { q: 'lea', cursor: undefined },
      }),
    );
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/u/[username]',
      params: { username: 'lea.m' },
    });
  });

  it('aucun membre : « Inviter quelqu’un » ouvre la sheet Inviter', async () => {
    mockApi.mockResolvedValue({ items: [] });
    await show(<MemberResults query="zzz" typing={false} />);
    expect(await screen.findByText('Aucun membre trouvé')).toBeTruthy();
    await fireEvent.press(screen.getByText("Inviter quelqu'un"));
    expect(useUiStore.getState().inviteOpen).toBe(true);
  });
});
