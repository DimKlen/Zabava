import type { LibraryMovie } from '@/domain/watchlist';
import { useUiStore } from '@/store/ui';

import { addTitle, patchTitle, removeTitle } from '../library';
import {
  currentUserTitle,
  removeFromList,
  setMovieWatched,
  setTitleAlerts,
  toggleInList,
  type ListTitle,
} from '../libraryActions';
import { queryClient } from '../queryClient';
import { watchlistKey } from '../watchlist';

jest.mock('../library', () => ({
  addTitle: jest.fn(() => Promise.resolve()),
  patchTitle: jest.fn(() => Promise.resolve()),
  removeTitle: jest.fn(() => Promise.resolve()),
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

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  queryClient.setQueryData(watchlistKey('movie'), [monteCristo, anatomie]);
  useUiStore.getState().hideToast();
  useUiStore.setState({ alertsOff: {} });
});

// Arrête le minuteur de 5 s du dernier toast.
afterAll(() => useUiStore.getState().hideToast());

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
    jest.mocked(addTitle).mockRejectedValueOnce(new Error('500'));

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
});

describe('setMovieWatched', () => {
  const film = asTitle(monteCristo);

  it('passe le film en Vu, puis « Annuler » le remet dans À voir', async () => {
    setMovieWatched(film, true);
    await flush();
    expect(currentUserTitle(film)?.status).toBe('watched');
    expect(useUiStore.getState().toast?.message).toBe('Marqué comme vu');
    expect(patchTitle).toHaveBeenCalledWith('movie-1', {
      status: 'watched',
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
