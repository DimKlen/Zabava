import { onlineManager } from '@tanstack/react-query';

import type { SeriesEpisode } from '@/domain/series';
import type { LibrarySeries } from '@/domain/seriesList';
import type { LibraryMovie } from '@/domain/watchlist';
import { useUiStore } from '@/store/ui';

import { episodesKey } from '../episodes';
import { ApiError } from '../http';
import { addTitle, markEpisodes, patchTitle, removeTitle, unmarkEpisodes } from '../library';
import {
  currentUserTitle,
  removeFromList,
  setEpisodesWatched,
  setMovieWatched,
  setSeriesAbandoned,
  setTitleAlerts,
  toggleInList,
  type ListTitle,
} from '../libraryActions';
import { clearMutationQueue, pendingCount, startMutationQueue } from '../mutationQueue';
import { queryClient } from '../queryClient';
import { watchlistKey } from '../watchlist';

jest.mock('../library', () => ({
  addTitle: jest.fn(() => Promise.resolve()),
  patchTitle: jest.fn(() => Promise.resolve()),
  removeTitle: jest.fn(() => Promise.resolve()),
  markEpisodes: jest.fn(() => Promise.resolve()),
  unmarkEpisodes: jest.fn(() => Promise.resolve()),
}));
jest.mock('../queryClient', () => {
  const { QueryClient } = jest.requireActual('@tanstack/react-query');
  // gcTime infini : pas de minuteur de nettoyage qui garderait Jest en vie.
  return { queryClient: new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } }) };
});
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

const dune: ListTitle = { id: 'movie-693134', tmdbId: 693134, type: 'movie', title: 'Dune' };

function libraryMovie(id: string, title: string, notificationsEnabled = true): LibraryMovie {
  return {
    id,
    tmdbId: Number(id.split('-')[1]),
    title,
    availability: { sub: [], rent: [], buy: [] },
    userTitle: {
      titleId: id,
      status: 'towatch',
      addedAt: '2026-10-01T10:00:00.000Z',
      notificationsEnabled,
    },
  };
}

const monteCristo = libraryMovie('movie-1', 'Le Comte de Monte-Cristo');
const anatomie = libraryMovie('movie-2', "Anatomie d'une chute", false);
const asTitle = (movie: LibraryMovie): ListTitle => ({ ...movie, type: 'movie' });

const list = () => queryClient.getQueryData<LibraryMovie[]>(watchlistKey('movie')) ?? [];
const ids = () => list().map((film) => film.id);
const flush = () => new Promise((resolve) => setImmediate(resolve));
const undo = () => useUiStore.getState().undoToast();

beforeEach(async () => {
  onlineManager.setOnline(true);
  await clearMutationQueue();
  jest.clearAllMocks();
  queryClient.clear();
  queryClient.setQueryData(watchlistKey('movie'), [monteCristo, anatomie]);
  useUiStore.getState().hideToast();
  useUiStore.setState({ alertsOff: {} });
});

// Comme au démarrage de l'app : la file repart au retour du réseau.
let stopQueue: () => void;
beforeAll(() => {
  stopQueue = startMutationQueue();
});

// Arrête le minuteur de 5 s du dernier toast.
afterAll(() => {
  stopQueue();
  useUiStore.getState().hideToast();
});

describe('toggleInList', () => {
  it('ajoute à Ma liste sans attendre le serveur, puis envoie la requête', async () => {
    toggleInList(dune);
    expect(useUiStore.getState().toast?.message).toBe('Ajouté à ma liste');
    await flush();

    expect(ids()).toEqual(['movie-693134', 'movie-1', 'movie-2']);
    expect(addTitle).toHaveBeenCalledWith(693134, 'movie', 'towatch', {
      notificationsEnabled: true,
    });
    expect(patchTitle).not.toHaveBeenCalled();
  });

  it('« Annuler » remet l’état d’avant, à l’écran et en base', async () => {
    toggleInList(dune);
    await flush();
    undo();
    await flush();

    expect(list()).toEqual([monteCristo, anatomie]);
    expect(removeTitle).toHaveBeenCalledWith('movie-693134');
    expect(useUiStore.getState().toast).toBeNull();
  });

  it('retire un titre déjà dans la liste', async () => {
    toggleInList(asTitle(monteCristo));
    expect(useUiStore.getState().toast?.message).toBe('Retiré de ma liste');
    await flush();

    expect(ids()).toEqual(['movie-2']);
    expect(removeTitle).toHaveBeenCalledWith('movie-1');
  });

  it('suit une série, avec le toast « Série suivie »', async () => {
    toggleInList({ id: 'tv-1', tmdbId: 1, type: 'tv', title: 'The Bear' });
    await flush();
    expect(addTitle).toHaveBeenCalledWith(1, 'tv', 'following', { notificationsEnabled: true });
    expect(useUiStore.getState().toast?.message).toBe('Série suivie');
  });

  it('restaure l’état d’avant si le serveur refuse', async () => {
    jest.mocked(addTitle).mockRejectedValueOnce(new ApiError(422, 'POST /me/titles'));

    toggleInList(dune);
    await flush();

    expect(list()).toEqual([monteCristo, anatomie]);
    expect(useUiStore.getState().toast?.message).toBe("Impossible d'enregistrer, réessaie");
  });

  it('reprend les alertes coupées hors liste au moment de l’ajout', async () => {
    setTitleAlerts(dune, false);
    toggleInList(dune);
    await flush();

    expect(currentUserTitle(dune)?.notificationsEnabled).toBe(false);
    // Le choix part avec l'ajout : pas de requête supplémentaire.
    expect(addTitle).toHaveBeenCalledWith(693134, 'movie', 'towatch', {
      notificationsEnabled: false,
    });
    expect(patchTitle).not.toHaveBeenCalled();
  });
});

describe('Annuler ne touche que le titre concerné', () => {
  it('annuler un retrait remet le film à sa place, sans défaire une autre action', async () => {
    removeFromList(asTitle(monteCristo));
    await flush();
    const undoFirst = useUiStore.getState().toast?.undo;

    toggleInList(dune);
    await flush();
    undoFirst?.();
    await flush();

    // Dune reste ajouté ; Monte-Cristo revient en tête, comme avant.
    expect(ids()).toEqual(['movie-1', 'movie-693134', 'movie-2']);
  });

  it('annuler un retrait renvoie la date d’ajout et les alertes d’origine', async () => {
    removeFromList(asTitle(anatomie));
    await flush();
    undo();
    await flush();

    expect(addTitle).toHaveBeenCalledWith(2, 'movie', 'towatch', {
      notificationsEnabled: false,
      addedAt: '2026-10-01T10:00:00.000Z',
      watchedAt: undefined,
    });
    expect(list()).toEqual([monteCristo, anatomie]);
  });
});

describe('rechargement de Ma liste', () => {
  it('attend la fin de toutes les requêtes avant de recharger', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    let resolveAdd: () => void = () => undefined;
    jest
      .mocked(addTitle)
      .mockImplementationOnce(() => new Promise<void>((resolve) => (resolveAdd = resolve)));

    toggleInList(dune);
    removeFromList(asTitle(monteCristo));
    await flush();
    expect(invalidate).not.toHaveBeenCalled();

    resolveAdd();
    await flush();
    expect(invalidate).toHaveBeenCalledTimes(1);
    invalidate.mockRestore();
  });

  it('À venir est rechargé avec Ma liste', async () => {
    queryClient.setQueryData(['upcoming', 'all'], { events: [], noDate: [] });
    toggleInList(dune);
    await flush();
    expect(queryClient.getQueryState(['upcoming', 'all'])?.isInvalidated).toBe(true);
  });
});

describe('setMovieWatched', () => {
  const film = asTitle(monteCristo);

  it('passe le film en Vu, puis « Annuler » le remet dans À voir', async () => {
    setMovieWatched(film, true);
    await flush();
    expect(currentUserTitle(film)?.status).toBe('watched');
    expect(useUiStore.getState().toast?.message).toBe('Marqué comme vu');
    // Date du tap, et non de l'envoi (la requête peut partir plus tard, hors ligne).
    expect(patchTitle).toHaveBeenCalledWith('movie-1', {
      status: 'watched',
      watchedAt: currentUserTitle(film)?.watchedAt,
      notificationsEnabled: undefined,
    });

    undo();
    await flush();
    expect(currentUserTitle(film)?.status).toBe('towatch');
    expect(patchTitle).toHaveBeenLastCalledWith('movie-1', {
      status: 'towatch',
      notificationsEnabled: undefined,
    });
  });

  it('un film hors liste marqué vu y entre directement en Vu', async () => {
    setMovieWatched(dune, true);
    await flush();
    expect(addTitle).toHaveBeenCalledWith(693134, 'movie', 'watched', {
      notificationsEnabled: true,
      watchedAt: currentUserTitle(dune)?.watchedAt,
    });
  });
});

describe('removeFromList', () => {
  it('affiche « Retiré de ma liste » avec Annuler', () => {
    removeFromList(asTitle(monteCristo));
    expect(useUiStore.getState().toast?.message).toBe('Retiré de ma liste');
    expect(useUiStore.getState().toast?.undo).toBeDefined();
  });
});

describe('séries', () => {
  const T1 = '2026-09-01T20:00:00.000Z';
  const T2 = '2026-10-05T20:00:00.000Z';
  const episode = (id: number, number: number, watchedAt?: string): SeriesEpisode => ({
    id,
    season: 1,
    number,
    airDate: '2026-09-01',
    watchedAt,
  });
  const bearEpisodes = [episode(11, 1, T1), episode(12, 2, T2), episode(13, 3)];
  const bear: LibrarySeries = {
    id: 'tv-1',
    tmdbId: 1,
    type: 'tv',
    title: 'The Bear',
    network: 'FX',
    ended: false,
    availability: { sub: [], rent: [], buy: [] },
    userTitle: {
      titleId: 'tv-1',
      status: 'following',
      addedAt: '2026-08-01T10:00:00.000Z',
      notificationsEnabled: false,
    },
    episodes: bearEpisodes,
  };
  const bearTitle: ListTitle = { id: 'tv-1', tmdbId: 1, type: 'tv', title: 'The Bear' };
  const series = () => queryClient.getQueryData<LibrarySeries[]>(watchlistKey('tv')) ?? [];
  const watchedIds = () =>
    (series()[0]?.episodes ?? []).filter((e) => e.watchedAt).map((e) => e.id);
  const ficheEpisodes = () => queryClient.getQueryData<SeriesEpisode[]>(episodesKey('tv', 1)) ?? [];

  beforeEach(() => {
    queryClient.setQueryData(watchlistKey('tv'), [bear]);
    queryClient.setQueryData(episodesKey('tv', 1), bearEpisodes);
  });

  it('cocher la carte avance aussitôt, puis « Annuler » décoche, à l’écran et en base', async () => {
    setEpisodesWatched(bearTitle, [episode(13, 3)], true);
    expect(useUiStore.getState().toast?.message).toBe('Épisode marqué comme vu');
    await flush();
    expect(watchedIds()).toEqual([11, 12, 13]);
    expect(ficheEpisodes().find((e) => e.id === 13)?.watchedAt).toBeDefined();
    expect(markEpisodes).toHaveBeenCalledWith(
      [13],
      ficheEpisodes().find((e) => e.id === 13)?.watchedAt,
    );

    undo();
    await flush();
    expect(series()).toEqual([bear]);
    expect(ficheEpisodes()).toEqual(bearEpisodes);
    expect(unmarkEpisodes).toHaveBeenCalledWith([13]);
  });

  it('la carte avance et « Annuler » la remet immédiatement, sans attendre de rechargement', async () => {
    // Un rechargement de Ma liste est en cours (après une action précédente).
    void queryClient
      .fetchQuery({
        queryKey: watchlistKey('tv'),
        queryFn: () => new Promise<LibrarySeries[]>(() => undefined),
        staleTime: 0,
      })
      // Interrompu par l'action : rejeté avec CancelledError.
      .catch(() => undefined);

    setEpisodesWatched(bearTitle, [episode(13, 3)], true);
    // Même tick : deux taps rapides voient déjà l'épisode suivant.
    expect(watchedIds()).toEqual([11, 12, 13]);

    undo();
    expect(series()).toEqual([bear]);
    await flush();
    // Le rechargement interrompu n'a pas remis l'état optimiste.
    expect(series()).toEqual([bear]);
  });

  it('« Oui » au dialogue : un seul toast pour n épisodes', async () => {
    setEpisodesWatched(bearTitle, [episode(13, 3), episode(14, 4)], true);
    expect(useUiStore.getState().toast?.message).toBe('2 épisodes marqués comme vus');
  });

  it('décocher une saison puis « Annuler » recoche avec les dates d’origine', async () => {
    setEpisodesWatched(bearTitle, [episode(11, 1, T1), episode(12, 2, T2)], false);
    expect(useUiStore.getState().toast?.message).toBe('Saison décochée');
    await flush();
    expect(watchedIds()).toEqual([]);
    expect(unmarkEpisodes).toHaveBeenCalledWith([11, 12]);

    undo();
    await flush();
    expect(series()).toEqual([bear]);
    expect(markEpisodes).toHaveBeenCalledWith([11], T1);
    expect(markEpisodes).toHaveBeenCalledWith([12], T2);
  });

  it('décocher un épisode : « Épisode décoché »', () => {
    setEpisodesWatched(bearTitle, [episode(12, 2, T2)], false);
    expect(useUiStore.getState().toast?.message).toBe('Épisode décoché');
  });

  it('cocher un épisode d’une série hors liste la suit ; « Annuler » la retire', async () => {
    const pitt: ListTitle = { id: 'tv-9', tmdbId: 9, type: 'tv', title: 'The Pitt' };
    queryClient.setQueryData(episodesKey('tv', 9), [episode(91, 1)]);
    setEpisodesWatched(pitt, [episode(91, 1)], true);
    await flush();
    expect(currentUserTitle(pitt)?.status).toBe('following');
    expect(series().map((s) => s.id)).toEqual(['tv-9', 'tv-1']);

    undo();
    await flush();
    expect(currentUserTitle(pitt)).toBeUndefined();
    expect(removeTitle).toHaveBeenCalledWith('tv-9');
    expect(unmarkEpisodes).not.toHaveBeenCalled();
  });

  it('swipe → Abandonner, puis « Annuler » la remet à sa place', async () => {
    setSeriesAbandoned(bearTitle, true);
    expect(useUiStore.getState().toast?.message).toBe('Série abandonnée');
    await flush();
    expect(series()[0]?.userTitle.status).toBe('abandoned');
    expect(patchTitle).toHaveBeenCalledWith('tv-1', {
      status: 'abandoned',
      notificationsEnabled: undefined,
    });

    undo();
    await flush();
    expect(series()).toEqual([bear]);
    expect(patchTitle).toHaveBeenLastCalledWith('tv-1', {
      status: 'following',
      notificationsEnabled: undefined,
    });
  });

  it('« Ne plus suivre » efface les épisodes vus ; « Annuler » remet tout comme avant', async () => {
    removeFromList(bearTitle, 'Série retirée');
    expect(useUiStore.getState().toast?.message).toBe('Série retirée');
    await flush();
    expect(series()).toEqual([]);
    expect(ficheEpisodes().every((e) => !e.watchedAt)).toBe(true);
    expect(removeTitle).toHaveBeenCalledWith('tv-1');

    undo();
    await flush();
    expect(series()).toEqual([bear]);
    expect(ficheEpisodes()).toEqual(bearEpisodes);
    expect(addTitle).toHaveBeenCalledWith(1, 'tv', 'following', {
      notificationsEnabled: false,
      addedAt: '2026-08-01T10:00:00.000Z',
      watchedAt: undefined,
    });
    expect(markEpisodes).toHaveBeenCalledWith([11], T1);
    expect(markEpisodes).toHaveBeenCalledWith([12], T2);
  });

  describe('hors ligne', () => {
    const settle = async () => {
      for (let i = 0; i < 10; i += 1) await flush();
    };

    it('coche 3 épisodes en mode avion, puis tout part au retour du réseau, sans doublon', async () => {
      onlineManager.setOnline(false);
      const pilot = [episode(13, 3), episode(14, 4), episode(15, 5)];
      queryClient.setQueryData(watchlistKey('tv'), [
        { ...bear, episodes: [...bearEpisodes, ...pilot.slice(1)] },
      ]);
      for (const ep of pilot) setEpisodesWatched(bearTitle, [ep], true);
      await settle();

      // Résultat visible tout de suite, rien n'est parti.
      expect(watchedIds()).toEqual([11, 12, 13, 14, 15]);
      expect(markEpisodes).not.toHaveBeenCalled();
      expect(pendingCount()).toBe(3);

      onlineManager.setOnline(true);
      await settle();

      expect(jest.mocked(markEpisodes).mock.calls.map(([ids]) => ids)).toEqual([[13], [14], [15]]);
      expect(pendingCount()).toBe(0);
      expect(useUiStore.getState().toast?.message).not.toBe("Impossible d'enregistrer, réessaie");
    });

    it('« Annuler » une action pas encore envoyée la retire de la file, sans requête', async () => {
      onlineManager.setOnline(false);
      setEpisodesWatched(bearTitle, [episode(13, 3)], true);
      await settle();
      undo();
      await settle();
      onlineManager.setOnline(true);
      await settle();

      expect(series()).toEqual([bear]);
      expect(markEpisodes).not.toHaveBeenCalled();
      expect(unmarkEpisodes).not.toHaveBeenCalled();
      expect(pendingCount()).toBe(0);
    });

    it('garde le cochage à l’écran et en file si le réseau coupe pendant l’envoi', async () => {
      jest.useFakeTimers({ doNotFake: ['setImmediate'] });
      jest.mocked(markEpisodes).mockRejectedValueOnce(new TypeError('Network request failed'));
      setEpisodesWatched(bearTitle, [episode(13, 3)], true);
      await settle();

      expect(watchedIds()).toEqual([11, 12, 13]);
      expect(pendingCount()).toBe(1);
      expect(useUiStore.getState().toast?.message).toBe('Épisode marqué comme vu');

      // Nouvel essai après le délai.
      jest.advanceTimersByTime(2_000);
      await settle();
      expect(markEpisodes).toHaveBeenCalledTimes(2);
      expect(pendingCount()).toBe(0);
      expect(watchedIds()).toEqual([11, 12, 13]);
      jest.useRealTimers();
    });
  });
});

describe('setTitleAlerts', () => {
  it('coupe les alertes d’un titre de la liste, sans Annuler', async () => {
    setTitleAlerts(asTitle(monteCristo), false);
    expect(useUiStore.getState().toast?.message).toBe('Alertes coupées pour ce titre');
    expect(useUiStore.getState().toast?.undo).toBeUndefined();
    await flush();
    expect(patchTitle).toHaveBeenCalledWith('movie-1', {
      status: undefined,
      notificationsEnabled: false,
    });
  });

  it('garde une préférence locale pour un titre hors liste', () => {
    setTitleAlerts(dune, false);
    expect(useUiStore.getState().alertsOff['movie-693134']).toBe(true);
    expect(patchTitle).not.toHaveBeenCalled();
  });
});
