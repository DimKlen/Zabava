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

const monteCristo: LibraryMovie = {
  id: 'movie-1',
  tmdbId: 1,
  title: 'Le Comte de Monte-Cristo',
  availability: { sub: [], rent: [], buy: [] },
  userTitle: {
    titleId: 'movie-1',
    status: 'towatch',
    addedAt: '2026-10-01T10:00:00.000Z',
    notificationsEnabled: true,
  },
};

const list = () => queryClient.getQueryData<LibraryMovie[]>(watchlistKey('movie')) ?? [];
const flush = () => new Promise((resolve) => setImmediate(resolve));

beforeEach(() => {
  jest.clearAllMocks();
  queryClient.clear();
  queryClient.setQueryData(watchlistKey('movie'), [monteCristo]);
  useUiStore.getState().hideToast();
});

// Arrête le minuteur de 5 s du dernier toast.
afterAll(() => useUiStore.getState().hideToast());

describe('toggleInList', () => {
  it('ajoute tout de suite à Ma liste et envoie la requête', async () => {
    toggleInList(dune);

    expect(list().map((film) => film.id)).toEqual(['movie-693134', 'movie-1']);
    expect(useUiStore.getState().toast?.message).toBe('Ajouté à ma liste');
    await flush();
    expect(addTitle).toHaveBeenCalledWith(693134, 'movie', 'towatch');
  });

  it('« Annuler » remet l’état d’avant, à l’écran et en base', async () => {
    toggleInList(dune);
    await flush();

    useUiStore.getState().undoToast();
    await flush();

    expect(list()).toEqual([monteCristo]);
    expect(removeTitle).toHaveBeenCalledWith('movie-693134', 'movie');
    expect(useUiStore.getState().toast).toBeNull();
  });

  it('retire un titre déjà dans la liste', async () => {
    toggleInList({ ...monteCristo, type: 'movie' });

    expect(list()).toEqual([]);
    expect(useUiStore.getState().toast?.message).toBe('Retiré de ma liste');
    await flush();
    expect(removeTitle).toHaveBeenCalledWith('movie-1', 'movie');
  });

  it('suit une série, avec le toast « Série suivie »', async () => {
    toggleInList({ id: 'tv-1', tmdbId: 1, type: 'tv', title: 'The Bear' });
    await flush();
    expect(addTitle).toHaveBeenCalledWith(1, 'tv', 'following');
    expect(useUiStore.getState().toast?.message).toBe('Série suivie');
  });

  it('restaure l’instantané si le serveur refuse', async () => {
    jest.mocked(addTitle).mockRejectedValueOnce(new Error('500'));

    toggleInList(dune);
    await flush();

    expect(list()).toEqual([monteCristo]);
    expect(useUiStore.getState().toast?.message).toBe("Impossible d'enregistrer, réessaie");
  });
});

describe('setMovieWatched', () => {
  const film: ListTitle = { ...monteCristo, type: 'movie' };

  it('passe le film en Vu, puis « Annuler » le remet dans À voir', async () => {
    setMovieWatched(film, true);
    expect(currentUserTitle(film)?.status).toBe('watched');
    expect(useUiStore.getState().toast?.message).toBe('Marqué comme vu');
    await flush();
    expect(patchTitle).toHaveBeenCalledWith('movie-1', 'movie', {
      status: 'watched',
      notificationsEnabled: undefined,
    });

    useUiStore.getState().undoToast();
    await flush();
    expect(currentUserTitle(film)?.status).toBe('towatch');
    expect(patchTitle).toHaveBeenLastCalledWith('movie-1', 'movie', {
      status: 'towatch',
      notificationsEnabled: undefined,
    });
  });

  it('un film hors liste marqué vu y entre directement en Vu', async () => {
    setMovieWatched(dune, true);
    await flush();
    expect(addTitle).toHaveBeenCalledWith(693134, 'movie', 'watched');
  });
});

describe('removeFromList', () => {
  it('affiche « Retiré de ma liste » avec Annuler', () => {
    removeFromList({ ...monteCristo, type: 'movie' });
    expect(useUiStore.getState().toast?.message).toBe('Retiré de ma liste');
    expect(useUiStore.getState().toast?.undo).toBeDefined();
  });
});

describe('setTitleAlerts', () => {
  it('coupe les alertes d’un titre de la liste, sans Annuler', async () => {
    setTitleAlerts({ ...monteCristo, type: 'movie' }, false);
    expect(useUiStore.getState().toast?.message).toBe('Alertes coupées pour ce titre');
    expect(useUiStore.getState().toast?.undo).toBeUndefined();
    await flush();
    expect(patchTitle).toHaveBeenCalledWith('movie-1', 'movie', {
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
