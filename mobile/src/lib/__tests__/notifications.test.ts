import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { api } from '@/api/http';

import {
  askNotificationPermission,
  listenToNotificationTaps,
  markNotificationPermissionAsked,
  openNotificationUrl,
  refreshPushToken,
  showNotificationsInForeground,
} from '../notifications';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
// Build de développement (pas Expo Go) : expo-notifications est disponible.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('@/api/http', () => ({ api: jest.fn(() => Promise.resolve()) }));
jest.mock('@/api/config', () => ({ easProjectId: () => 'projet-eas' }));

const mockLast = jest.fn();
const mockClear = jest.fn();
const mockRemove = jest.fn();
let mockListener: ((response: unknown) => void) | undefined;
const mockGetPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockSetHandler = jest.fn();
jest.mock('../expoNotifications', () => ({
  loadNotifications: () =>
    Promise.resolve({
      getPermissionsAsync: () => mockGetPermissions(),
      requestPermissionsAsync: () => mockRequestPermissions(),
      getExpoPushTokenAsync: () => Promise.resolve({ data: 'ExponentPushToken[abc]' }),
      setNotificationHandler: (handler: unknown) => mockSetHandler(handler),
      addNotificationResponseReceivedListener: (listener: (response: unknown) => void) => {
        mockListener = listener;
        return { remove: mockRemove };
      },
      getLastNotificationResponseAsync: () => mockLast(),
      clearLastNotificationResponseAsync: () => mockClear(),
    }),
}));

const response = (url: string) => ({ notification: { request: { content: { data: { url } } } } });

const UNDETERMINED = { granted: false, canAskAgain: true };
const GRANTED = { granted: true, canAskAgain: true };
const BLOCKED = { granted: false, canAskAgain: false };

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockListener = undefined;
  mockLast.mockResolvedValue(null);
  mockGetPermissions.mockResolvedValue(UNDETERMINED);
  mockRequestPermissions.mockResolvedValue(GRANTED);
});

const tokenSaved = () =>
  expect(api).toHaveBeenCalledWith(
    '/me/push-token',
    expect.objectContaining({
      method: 'POST',
      body: expect.objectContaining({ expoToken: 'ExponentPushToken[abc]' }),
    }),
  );
const wanted = jest.fn(() => Promise.resolve(true));

describe('refreshPushToken (démarrage)', () => {
  it('permission accordée : jeton enregistré, sans demande', async () => {
    mockGetPermissions.mockResolvedValue(GRANTED);
    await refreshPushToken(wanted);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    tokenSaved();
  });

  it('jamais demandée sur cet appareil (onboarding fait ailleurs) : demande puis jeton', async () => {
    await refreshPushToken(wanted);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    tokenSaved();
  });

  it('demande faite une seule fois : refusée, elle ne revient pas au démarrage suivant', async () => {
    mockRequestPermissions.mockResolvedValue(UNDETERMINED);
    await refreshPushToken(wanted);
    await refreshPushToken(wanted);
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    expect(api).not.toHaveBeenCalled();
  });

  it('« Plus tard » à l’onboarding : pas de demande au démarrage', async () => {
    await markNotificationPermissionAsked();
    await refreshPushToken(wanted);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
  });

  it('toutes les notifications coupées dans le profil : pas de demande', async () => {
    await refreshPushToken(() => Promise.resolve(false));
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
  });

  it('permission bloquée : ni demande ni jeton', async () => {
    mockGetPermissions.mockResolvedValue(BLOCKED);
    await refreshPushToken(wanted);
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
  });
});

describe('askNotificationPermission (cloche)', () => {
  it('jamais demandée : demande, même après « Plus tard », puis jeton', async () => {
    await markNotificationPermissionAsked();
    await askNotificationPermission();
    expect(mockRequestPermissions).toHaveBeenCalledTimes(1);
    tokenSaved();
  });

  it('déjà accordée : rien à refaire', async () => {
    mockGetPermissions.mockResolvedValue(GRANTED);
    await askNotificationPermission();
    expect(mockRequestPermissions).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalled();
  });
});

describe('showNotificationsInForeground', () => {
  it('app ouverte : la notification est affichée, avec son', async () => {
    await showNotificationsInForeground();
    const handler = mockSetHandler.mock.calls[0][0] as {
      handleNotification: () => Promise<Record<string, boolean>>;
    };
    await expect(handler.handleNotification()).resolves.toMatchObject({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
    });
  });
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('openNotificationUrl', () => {
  it('nouvel épisode : Ma liste puis la fiche, saison et épisode', () => {
    openNotificationUrl('zabava://title/tv/2734?tab=episodes&season=28&episode=2');
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/watchlist');
    expect(router.push).toHaveBeenCalledWith('/title/tv/2734?tab=episodes&season=28&episode=2');
  });

  it('notification groupée : onglet À venir', () => {
    openNotificationUrl('zabava://upcoming');
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/upcoming');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('nouvel abonné, demande acceptée : onglet Profil puis le profil', () => {
    openNotificationUrl('zabava://u/lea.m');
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/profile');
    expect(router.push).toHaveBeenCalledWith('/u/lea.m');
  });

  it('abonnés groupés : ma liste d’abonnés', () => {
    openNotificationUrl('zabava://u/dim.k/connections?tab=followers');
    expect(router.push).toHaveBeenCalledWith('/u/dim.k/connections?tab=followers');
  });

  it('demande d’abonnement : Demandes', () => {
    openNotificationUrl('zabava://follow-requests');
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/profile');
    expect(router.push).toHaveBeenCalledWith('/follow-requests');
  });

  it('lien inconnu : ignoré', () => {
    openNotificationUrl('zabava://ailleurs');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});

describe('listenToNotificationTaps', () => {
  it('à chaud : le tap ouvre le lien', async () => {
    const stop = listenToNotificationTaps();
    await flush();
    mockListener?.(response('zabava://title/movie/603'));
    expect(router.push).toHaveBeenCalledWith('/title/movie/603');
    stop();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('à froid : la notification qui a lancé l’app est ouverte une seule fois', async () => {
    mockLast.mockResolvedValue(response('zabava://title/anime/209867?tab=episodes&season=2'));
    listenToNotificationTaps();
    await flush();
    await flush();
    expect(router.push).toHaveBeenCalledWith('/title/anime/209867?tab=episodes&season=2');
    expect(mockClear).toHaveBeenCalled();
  });
});
