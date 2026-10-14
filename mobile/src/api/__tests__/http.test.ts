import { api, ApiError, REQUEST_TIMEOUT_MS, setUnauthorizedHandler, TimeoutError } from '../http';

const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();

jest.mock('../supabase', () => ({
  supabase: () => ({ auth: { getSession: mockGetSession, refreshSession: mockRefreshSession } }),
}));
jest.mock('../config', () => ({ config: { apiUrl: 'https://api.test' } }));

const fetchMock = jest.fn();

function response(status: number, body?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  };
}

function session(token: string) {
  return { data: { session: { access_token: token } }, error: null };
}

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  mockGetSession.mockResolvedValue(session('jeton-1'));
});

describe('api', () => {
  it('ajoute le JWT et la requête, puis lit le JSON', async () => {
    fetchMock.mockResolvedValue(response(200, [{ id: 8 }]));

    const result = await api('/discover', { query: { type: 'movie', page: 2, lang: undefined } });

    expect(result).toEqual([{ id: 8 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/discover?type=movie&page=2',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Authorization: 'Bearer jeton-1' }),
      }),
    );
  });

  it('envoie le corps en JSON et accepte une réponse vide (204)', async () => {
    fetchMock.mockResolvedValue(response(204));

    await expect(
      api('/me/providers', { method: 'PUT', body: { providerIds: [8] } }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.test/api/v1/me/providers',
      expect.objectContaining({ method: 'PUT', body: '{"providerIds":[8]}' }),
    );
  });

  it('rafraîchit la session après un 401 et réessaie une fois', async () => {
    mockRefreshSession.mockResolvedValue(session('jeton-2'));
    fetchMock.mockResolvedValueOnce(response(401)).mockResolvedValueOnce(response(200, {}));

    await api('/me/profile');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer jeton-2');
  });

  it('renvoie vers /login si le rafraîchissement échoue', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);
    mockRefreshSession.mockResolvedValue({ data: { session: null }, error: new Error('expirée') });
    fetchMock.mockResolvedValue(response(401));

    await expect(api('/me/profile')).rejects.toEqual(new ApiError(401, 'Session expirée'));
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('lève une ApiError pour les autres erreurs', async () => {
    fetchMock.mockResolvedValue(response(502));

    await expect(api('/trending')).rejects.toMatchObject({ status: 502 });
  });
});

describe('délai', () => {
  // fetch qui ne répond jamais, mais s'interrompt quand son signal est annulé.
  const hangingFetch = (_url: string, init: { signal: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      // Comme fetch : un signal déjà annulé rejette tout de suite.
      if (init.signal.aborted) reject(new Error('Aborted'));
      init.signal.addEventListener('abort', () => reject(new Error('Aborted')));
    });

  afterEach(() => jest.useRealTimers());

  it('échoue si le serveur ne répond pas à temps', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(hangingFetch);
    const request = api('/genre');
    const failed = expect(request).rejects.toBeInstanceOf(TimeoutError);
    await jest.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    await failed;
  });

  it('garde l’annulation de l’appelant (changement de clé de requête)', async () => {
    fetchMock.mockImplementation(hangingFetch);
    const controller = new AbortController();
    const request = api('/search', { signal: controller.signal });
    await Promise.resolve();
    controller.abort();
    await expect(request).rejects.toThrow('Aborted');
  });
});
