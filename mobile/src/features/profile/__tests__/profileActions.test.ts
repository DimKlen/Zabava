import { api } from '@/api/http';
import { profileKey, type Profile } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { showToast } from '@/store/ui';

import { changeCatalogSetting, toggleProvider, updatePreference } from '../profileActions';

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
jest.mock('@/lib/notifications', () => ({ unregisterPushToken: jest.fn() }));
jest.mock('@/store/ui', () => ({ showToast: jest.fn(), openDialog: jest.fn() }));

const mockApi = api as jest.MockedFunction<typeof api>;

const PROFILE: Profile = {
  language: 'fr-CA',
  spoilerProtection: false,
  providerIds: [8],
  notificationPrefs: {
    episodes: true,
    cinema: true,
    streaming: true,
    seasons: true,
    digestHour: 9,
  },
};

const profile = () => queryClient.getQueryData<Profile>(profileKey);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  queryClient.setQueryData(profileKey, PROFILE);
});

describe('changeCatalogSetting', () => {
  it('ne change la langue qu’après l’enregistrement, puis recharge le catalogue', async () => {
    const put = deferred<Profile>();
    mockApi.mockReturnValueOnce(put.promise);
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const done = changeCatalogSetting({ language: 'en-US' });
    await Promise.resolve();
    // Pendant l'envoi : toujours l'ancienne langue.
    expect(profile()?.language).toBe('fr-CA');
    expect(invalidate).not.toHaveBeenCalled();

    put.resolve({ ...PROFILE, language: 'en-US' });
    await expect(done).resolves.toBe(true);
    expect(profile()?.language).toBe('en-US');
    expect(invalidate).toHaveBeenCalled();
    invalidate.mockRestore();
  });

  it('région : enregistrée, puis tout le catalogue rechargé (dates, badges, pays des offres)', async () => {
    mockApi.mockResolvedValueOnce({ ...PROFILE, region: 'FR' });
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    await expect(changeCatalogSetting({ region: 'FR' })).resolves.toBe(true);
    expect(mockApi).toHaveBeenCalledWith('/me/profile', { method: 'PUT', body: { region: 'FR' } });
    expect(profile()?.region).toBe('FR');
    expect(invalidate).toHaveBeenCalled();
    invalidate.mockRestore();
  });

  it('échec : profil inchangé et toast', async () => {
    mockApi.mockRejectedValueOnce(new Error('réseau'));
    await expect(changeCatalogSetting({ language: 'en-US' })).resolves.toBe(false);
    expect(profile()?.language).toBe('fr-CA');
    expect(showToast).toHaveBeenCalledWith("Impossible d'enregistrer, réessaie");
  });
});

describe('toggleProvider', () => {
  it('coche tout de suite et envoie la nouvelle liste', async () => {
    mockApi.mockResolvedValueOnce(undefined);
    const done = toggleProvider({ id: 230, name: 'Crave', short: 'C', ids: [230, 231] });
    expect(profile()?.providerIds).toEqual([8, 230, 231]);
    await done;
    expect(mockApi).toHaveBeenCalledWith('/me/providers', {
      method: 'PUT',
      body: { providerIds: [8, 230, 231] },
    });
  });

  it('échec : revient à la liste d’avant', async () => {
    mockApi.mockRejectedValueOnce(new Error('réseau'));
    await expect(toggleProvider({ id: 8, name: 'Netflix', short: 'N', ids: [8] })).resolves.toBe(
      false,
    );
    expect(profile()?.providerIds).toEqual([8]);
    expect(showToast).toHaveBeenCalled();
  });
});

describe('updatePreference', () => {
  it('échec : seul le réglage modifié revient, pas un autre changé entre-temps', async () => {
    const put = deferred<Profile>();
    mockApi.mockReturnValueOnce(put.promise);
    const done = updatePreference({ spoilerProtection: true });
    expect(profile()?.spoilerProtection).toBe(true);
    // Une autre modification arrive pendant l'envoi.
    queryClient.setQueryData<Profile>(profileKey, (p) => (p ? { ...p, providerIds: [8, 9] } : p));
    put.reject(new Error('réseau'));
    await expect(done).resolves.toBe(false);
    expect(profile()?.spoilerProtection).toBe(false);
    expect(profile()?.providerIds).toEqual([8, 9]);
  });

  it('notifications : fusion avec les autres préférences', async () => {
    mockApi.mockResolvedValueOnce(PROFILE);
    await updatePreference({ notificationPrefs: { cinema: false } });
    expect(profile()?.notificationPrefs).toEqual({
      episodes: true,
      cinema: false,
      streaming: true,
      seasons: true,
      digestHour: 9,
    });
  });
});
