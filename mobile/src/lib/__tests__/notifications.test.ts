import { router } from 'expo-router';

import { listenToNotificationTaps, openNotificationUrl } from '../notifications';

jest.mock('expo-router', () => ({ router: { navigate: jest.fn(), push: jest.fn() } }));
// Build de développement (pas Expo Go) : expo-notifications est disponible.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'bare' },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
jest.mock('@/api/http', () => ({ api: jest.fn() }));

const mockLast = jest.fn();
const mockClear = jest.fn();
const mockRemove = jest.fn();
let mockListener: ((response: unknown) => void) | undefined;
jest.mock('../expoNotifications', () => ({
  loadNotifications: () =>
    Promise.resolve({
      addNotificationResponseReceivedListener: (listener: (response: unknown) => void) => {
        mockListener = listener;
        return { remove: mockRemove };
      },
      getLastNotificationResponseAsync: () => mockLast(),
      clearLastNotificationResponseAsync: () => mockClear(),
    }),
}));

const response = (url: string) => ({ notification: { request: { content: { data: { url } } } } });

beforeEach(() => {
  jest.clearAllMocks();
  mockListener = undefined;
  mockLast.mockResolvedValue(null);
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
