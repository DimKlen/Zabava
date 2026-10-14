import { onlineManager } from '@tanstack/react-query';

import { useUiStore } from '@/store/ui';

import { ApiError } from '../http';
import { addTitle, markEpisodes, removeTitle } from '../library';
import {
  cancelGroup,
  clearMutationQueue,
  enqueue,
  pendingCount,
  startMutationQueue,
  whenSettled,
} from '../mutationQueue';

// Stockage partagé entre deux chargements du module (simule un redémarrage de l'app).
const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
  setItem: jest.fn((key: string, value: string) =>
    Promise.resolve(void mockStorage.set(key, value)),
  ),
  removeItem: jest.fn((key: string) => Promise.resolve(void mockStorage.delete(key))),
}));
jest.mock('../library', () => ({
  addTitle: jest.fn(() => Promise.resolve()),
  patchTitle: jest.fn(() => Promise.resolve()),
  removeTitle: jest.fn(() => Promise.resolve()),
  markEpisodes: jest.fn(() => Promise.resolve()),
  unmarkEpisodes: jest.fn(() => Promise.resolve()),
}));
jest.mock('../queryClient', () => {
  const { QueryClient } = jest.requireActual('@tanstack/react-query');
  return { queryClient: new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } }) };
});

const flush = () => new Promise((resolve) => setImmediate(resolve));
const settle = async () => {
  for (let i = 0; i < 10; i += 1) await flush();
};
const STORAGE_KEY = 'zabava.mutation-queue';
const mark = (id: number) => ({ kind: 'mark' as const, episodeIds: [id], watchedAt: 'T' });

let stopQueue: () => void;
beforeAll(() => {
  stopQueue = startMutationQueue();
});
afterAll(() => {
  stopQueue();
  useUiStore.getState().hideToast();
});

beforeEach(async () => {
  jest.useRealTimers();
  onlineManager.setOnline(true);
  await clearMutationQueue();
  mockStorage.clear();
  jest.clearAllMocks();
  useUiStore.getState().hideToast();
});

it('persiste la file hors ligne', async () => {
  onlineManager.setOnline(false);
  enqueue('tv', [mark(1)]);
  await settle();

  const stored = JSON.parse(mockStorage.get(STORAGE_KEY) ?? '[]') as { op: unknown }[];
  expect(stored.map((entry) => entry.op)).toEqual([mark(1)]);
  expect(markEpisodes).not.toHaveBeenCalled();
});

it('reprend après un redémarrage la file laissée hors ligne', async () => {
  mockStorage.set(
    STORAGE_KEY,
    JSON.stringify([
      { id: 'a', group: 'g1', type: 'tv', op: mark(1) },
      { id: 'b', group: 'g2', type: 'movie', op: { kind: 'remove', titleId: 'movie-2' } },
    ]),
  );
  await jest.isolateModulesAsync(async () => {
    const library = jest.requireMock<typeof import('../library')>('../library');
    const queue = jest.requireActual<typeof import('../mutationQueue')>('../mutationQueue');
    const stop = queue.startMutationQueue();
    await settle();
    stop();
    expect(queue.pendingCount()).toBe(0);
    expect(library.markEpisodes).toHaveBeenCalledWith([1], 'T');
    expect(library.removeTitle).toHaveBeenCalledWith('movie-2');
  });
  expect(mockStorage.has(STORAGE_KEY)).toBe(false);
});

it('envoie dans l’ordre, une requête à la fois', async () => {
  const order: string[] = [];
  jest.mocked(markEpisodes).mockImplementation(async (ids) => {
    order.push(`mark ${ids[0]}`);
  });
  jest.mocked(removeTitle).mockImplementation(async (id) => {
    order.push(`remove ${id}`);
  });
  enqueue('tv', [mark(1)]);
  enqueue('tv', [{ kind: 'remove', titleId: 'tv-9' }]);
  enqueue('tv', [mark(2)]);
  await settle();
  expect(order).toEqual(['mark 1', 'remove tv-9', 'mark 2']);
});

it('rejette l’action et passe à la suivante si le serveur refuse', async () => {
  jest.mocked(addTitle).mockRejectedValueOnce(new ApiError(404, 'POST /me/titles'));
  const refused = enqueue('movie', [
    { kind: 'add', tmdbId: 1, type: 'movie', status: 'towatch', extras: {} },
    mark(5),
  ]);
  const next = enqueue('tv', [mark(6)]);

  await expect(refused.done).rejects.toBeInstanceOf(ApiError);
  await next.done;
  // Le reste de l'action refusée est abandonné.
  expect(jest.mocked(markEpisodes).mock.calls.map(([ids]) => ids)).toEqual([[6]]);
});

it('réessaie une erreur serveur, puis abandonne après 4 essais', async () => {
  jest.useFakeTimers({ doNotFake: ['setImmediate'] });
  jest.mocked(markEpisodes).mockRejectedValue(new ApiError(503, 'POST'));
  const action = enqueue('tv', [mark(1)]);
  const rejected = action.done.catch((error: unknown) => error);

  for (let i = 0; i < 6; i += 1) {
    await settle();
    jest.advanceTimersByTime(30_000);
  }
  await settle();

  expect(markEpisodes).toHaveBeenCalledTimes(5);
  expect(await rejected).toBeInstanceOf(ApiError);
  expect(pendingCount()).toBe(0);
  jest.mocked(markEpisodes).mockResolvedValue();
});

it('affiche « Impossible d’enregistrer » pour un refus d’une action d’avant le redémarrage', async () => {
  mockStorage.set(
    STORAGE_KEY,
    JSON.stringify([{ id: 'a', group: 'g1', type: 'movie', op: { kind: 'remove', titleId: 'x' } }]),
  );
  await jest.isolateModulesAsync(async () => {
    const library = jest.requireMock<typeof import('../library')>('../library');
    const http = jest.requireActual<typeof import('../http')>('../http');
    jest.mocked(library.removeTitle).mockRejectedValueOnce(new http.ApiError(400, 'DELETE'));
    const { useUiStore: store } = jest.requireActual<typeof import('@/store/ui')>('@/store/ui');
    const queue = jest.requireActual<typeof import('../mutationQueue')>('../mutationQueue');
    const stop = queue.startMutationQueue();
    await settle();
    stop();
    expect(store.getState().toast?.message).toBe("Impossible d'enregistrer, réessaie");
    store.getState().hideToast();
  });
});

it('« Annuler » retire une action en attente, mais pas une action déjà partie', async () => {
  onlineManager.setOnline(false);
  const waiting = enqueue('tv', [mark(1)]);
  expect(cancelGroup(waiting.group)).toBe(true);
  await expect(waiting.done).resolves.toBeUndefined();

  onlineManager.setOnline(true);
  const sent = enqueue('tv', [mark(2)]);
  await sent.done;
  expect(cancelGroup(sent.group)).toBe(false);
  expect(jest.mocked(markEpisodes).mock.calls.map(([ids]) => ids)).toEqual([[2]]);
});

it('whenSettled attend la fin des envois, mais pas hors ligne', async () => {
  let release: () => void = () => undefined;
  jest
    .mocked(markEpisodes)
    .mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
  enqueue('tv', [mark(1)]);
  let settled = false;
  void whenSettled().then(() => (settled = true));
  await settle();
  expect(settled).toBe(false);
  release();
  await settle();
  expect(settled).toBe(true);

  onlineManager.setOnline(false);
  enqueue('tv', [mark(2)]);
  await settle();
  await expect(whenSettled()).resolves.toBeUndefined();
});

it('se vide à la déconnexion', async () => {
  onlineManager.setOnline(false);
  enqueue('tv', [mark(1)]);
  await clearMutationQueue();
  onlineManager.setOnline(true);
  await settle();
  expect(markEpisodes).not.toHaveBeenCalled();
  expect(mockStorage.has(STORAGE_KEY)).toBe(false);
});

it('au retour du réseau, un rechargement attend les envois en attente', async () => {
  onlineManager.setOnline(false);
  enqueue('tv', [mark(1)]);
  await settle();

  let settled = false;
  let release: () => void = () => undefined;
  jest
    .mocked(markEpisodes)
    .mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
  // Comme dans l'app : TanStack relance Ma liste juste avant que la file reparte.
  void whenSettled().then(() => (settled = true));
  onlineManager.setOnline(true);
  await settle();
  expect(settled).toBe(false);

  release();
  await settle();
  expect(settled).toBe(true);
});
