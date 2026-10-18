import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { removeFromList, setMovieWatched } from '@/api/libraryActions';
import { LIBRARY } from '@/domain/__fixtures__/prototypeFilms';
import type { LibraryMovie } from '@/domain/watchlist';
import { useUiStore } from '@/store/ui';

import { FilmsTab } from '../FilmsTab';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  useScrollToTop: jest.fn(),
}));
jest.mock('@/api/profile', () => ({
  // Mes plateformes du prototype : Netflix, Crave, Prime Video.
  useProfile: () => ({ data: { providerIds: [8, 230, 119] } }),
}));
jest.mock('@/api/libraryActions', () => ({
  removeFromList: jest.fn(),
  setMovieWatched: jest.fn(),
}));

let mockFilms: LibraryMovie[] | undefined = LIBRARY;
jest.mock('@/api/watchlist', () => ({
  useMovieWatchlist: () => ({
    data: mockFilms,
    isError: false,
    // Rechargement automatique en cours (après un ajout ou un retrait).
    isRefetching: true,
    refetch: jest.fn(),
  }),
}));

// Fige « aujourd'hui » au 10 octobre 2026, comme le prototype.
beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 10, 12, 0) }));
afterAll(() => jest.useRealTimers());

beforeEach(async () => {
  jest.clearAllMocks();
  mockFilms = LIBRARY;
  await act(() =>
    useUiStore.setState({
      filmSegment: 'towatch',
      filmFilter: 'all',
      filmSort: 'added',
      actionSheet: null,
      actionSheetOpen: false,
    }),
  );
});

/** Affiche l'onglet, puis passe les 700 ms de squelettes. */
async function renderTab() {
  await render(<FilmsTab />);
  await act(() => jest.advanceTimersByTime(700));
}

function first<T>(items: T[]): T {
  const [item] = items;
  if (item === undefined) throw new Error('liste vide');
  return item;
}

const posterTitles = () =>
  screen.getAllByTestId('poster').map((poster) => poster.props.accessibilityLabel as string);

describe('FilmsTab', () => {
  it('affiche les films À voir, avec la ligne d’aide et les badges', async () => {
    await renderTab();
    expect(screen.getByText("9 films · appui long pour plus d'options")).toBeTruthy();
    expect(posterTitles()[0]).toBe('Dune : Troisième partie');
    // Dune 3 et Avengers sortent le même jour ; « Au cinéma » est aussi un filtre.
    expect(screen.getAllByText('18 déc.')).toHaveLength(2);
    expect(screen.getAllByText('Au cinéma')).toHaveLength(2);
    expect(screen.getByText('Netflix')).toBeTruthy();
  });

  it('le filtre « Sur mes plateformes » garde les films en abonnement ou en location chez moi', async () => {
    await renderTab();
    await fireEvent.press(screen.getByText('Sur mes plateformes'));
    expect(posterTitles()).toEqual([
      'Wicked : Pour de bon',
      "Une bataille après l'autre",
      'Pécheurs',
      'Projet Dernière chance',
      'Le Comte de Monte-Cristo',
    ]);
  });

  it('le tri ouvre « Trier par » et applique le tri par titre', async () => {
    await renderTab();
    await fireEvent.press(screen.getByText("Date d'ajout"));
    const sheet = useUiStore.getState().actionSheet;
    expect(sheet?.title).toBe('Trier par');
    expect(sheet?.options.map((option) => option.label)).toEqual([
      "Date d'ajout",
      'Date de sortie',
      'Titre',
      'Note IMDb',
    ]);
    await act(() => sheet?.options[2]?.onPress());
    expect(posterTitles()[0]).toBe('Avengers : Le Jour du Jugement');
  });

  it('segment Vus : ordre de visionnage, sans tri ni filtre', async () => {
    await renderTab();
    await fireEvent.press(screen.getByText('Vus'));
    expect(posterTitles()).toEqual([
      'Dune : Deuxième partie',
      'Oppenheimer',
      "Anatomie d'une chute",
    ]);
    expect(screen.queryByText('Tout')).toBeNull();
    expect(screen.queryByText("Date d'ajout")).toBeNull();
  });

  it('appui long : menu du film, puis « Marquer comme vu »', async () => {
    await renderTab();
    await fireEvent(first(screen.getAllByTestId('poster')), 'longPress');
    const sheet = useUiStore.getState().actionSheet;
    expect(sheet?.title).toBe('Dune : Troisième partie');
    await act(() => sheet?.options[0]?.onPress());
    expect(setMovieWatched).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dune : Troisième partie' }),
      true,
    );
  });

  it('la coche d’une affiche retire le film', async () => {
    await renderTab();
    await fireEvent.press(first(screen.getAllByTestId('poster-add')));
    expect(removeFromList).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'dune3', type: 'movie' }),
    );
  });

  it('filtre sans résultat : « Aucun film pour ce filtre » puis « Tout afficher »', async () => {
    mockFilms = LIBRARY.filter((film) => film.id !== 'odyssey');
    await renderTab();
    await fireEvent.press(screen.getByText('Au cinéma'));
    expect(screen.getByText('Aucun film pour ce filtre')).toBeTruthy();
    await fireEvent.press(screen.getByText('Tout afficher'));
    expect(useUiStore.getState().filmFilter).toBe('all');
  });

  it('liste vide : « Ta liste est vide »', async () => {
    mockFilms = [];
    await renderTab();
    expect(screen.getByText('Ta liste est vide')).toBeTruthy();
    expect(screen.getByText('Découvrir des films')).toBeTruthy();
  });

  it('aucun film vu : « Aucun film vu pour l’instant »', async () => {
    mockFilms = LIBRARY.filter((film) => film.userTitle.status === 'towatch');
    await renderTab();
    await fireEvent.press(screen.getByText('Vus'));
    expect(screen.getByText("Aucun film vu pour l'instant")).toBeTruthy();
  });
  it('pas d’indicateur de rafraîchissement pendant un rechargement automatique', async () => {
    await renderTab();
    const grid = screen.getByTestId('films-grid');
    expect(grid.props.refreshControl.props.refreshing).toBe(false);
  });

  it('pas de squelettes au retour sur l’onglet', async () => {
    const first = await render(<FilmsTab />);
    await act(() => jest.advanceTimersByTime(700));
    await first.unmount();

    await render(<FilmsTab />);
    expect(screen.getByText("9 films · appui long pour plus d'options")).toBeTruthy();
  });
});
