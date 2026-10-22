import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setMovieWatched, toggleInList } from '@/api/libraryActions';
import type { TitleDetail } from '@/api/titles';

import { MovieScreen } from '../MovieScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/api/profile', () => ({
  useProfile: () => ({ data: { region: 'CA', providerIds: [230] } }),
}));
jest.mock('@/api/watchlist', () => ({ useMovieWatchlist: () => ({ data: [] }) }));
jest.mock('@/api/libraryActions', () => ({
  setMovieWatched: jest.fn(),
  setTitleAlerts: jest.fn(),
  toggleInList: jest.fn(),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const base: TitleDetail = {
  id: 'movie-1',
  tmdbId: 1,
  type: 'movie',
  title: 'Dune : Troisième partie',
  year: 2026,
  studios: [],
  genres: ['Science-fiction', 'Aventure'],
  certification: '13+',
  releaseTheatrical: '2026-12-18',
  seasons: [],
  availability: { sub: [], rent: [], buy: [] },
  cast: [],
  directors: ['Denis Villeneuve'],
  directorIds: [137427],
  writerIds: [],
  creatorIds: [],
  writers: [],
  creators: [],
  networks: [],
  collection: [],
  similar: [],
};

async function renderMovie(movie: TitleDetail) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <MovieScreen id={movie.id} movie={movie} />
    </SafeAreaProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('chargement', () => {
  it('l’en-tête reste en place à l’arrivée de la fiche : seuls les squelettes sont remplacés', async () => {
    const preview = { type: 'movie' as const, tmdbId: 1, title: base.title, posterPath: '/p.jpg' };
    const tree = (movie?: TitleDetail) => (
      <SafeAreaProvider initialMetrics={metrics}>
        <MovieScreen id="movie-1" preview={preview} movie={movie} />
      </SafeAreaProvider>
    );
    await render(tree());
    const poster = screen.getByLabelText(base.title);
    expect(screen.getByTestId('title-skeleton')).toBeTruthy();
    expect(screen.queryByText('Ajouter à ma liste')).toBeNull();

    await screen.rerender(tree({ ...base, posterPath: '/p.jpg' }));

    // Même élément d'affiche : pas de remontage (ni nouveau fondu de l'image).
    expect(screen.getByLabelText(base.title)).toBe(poster);
    expect(screen.queryByTestId('title-skeleton')).toBeNull();
    expect(screen.getByText('Ajouter à ma liste')).toBeTruthy();
  });
});

describe('MovieScreen', () => {
  it('sans note : aucune chip ; sans plateforme : disponibilité inconnue', async () => {
    await renderMovie(base);
    expect(screen.queryByText('IMDb')).toBeNull();
    expect(screen.queryByText('Rotten Tomatoes')).toBeNull();
    expect(screen.getByText('Disponibilité inconnue.')).toBeTruthy();
  });

  it('affiche les notes, les plateformes de location sans libellé et le bandeau', async () => {
    await renderMovie({
      ...base,
      imdbRating: 8.5,
      imdbVotes: 640_000,
      rtScore: 92,
      releaseTheatrical: '2024-03-01',
      availability: {
        sub: [{ id: 230, name: 'Crave', short: 'C', countries: ['FR', 'CA'] }],
        rent: [{ id: 350, name: 'Apple TV+', short: 'tv', countries: ['FR', 'US'] }],
        buy: [],
      },
    });
    expect(screen.getByText('8,5/10')).toBeTruthy();
    expect(screen.getByText('Rotten Tomatoes')).toBeTruthy();
    // Abonnement et location, sans libellé. Profil au Canada : pas de pays pour Crave, proposé
    // au Canada ; pour Apple TV+, seulement le pays le plus proche.
    expect(screen.getByLabelText('Crave')).toBeTruthy();
    expect(screen.getByText('Crave')).toBeTruthy();
    expect(screen.getByLabelText('Apple TV+ (États-Unis)')).toBeTruthy();
    expect(screen.getByText('Apple TV+ (États-Unis)')).toBeTruthy();
    expect(screen.queryByText('Abonnement')).toBeNull();
    expect(screen.queryByText('Location')).toBeNull();
    expect(screen.queryByText('Achat')).toBeNull();
    expect(screen.getByText('Disponible en streaming')).toBeTruthy();
  });

  it('montre la méta, l’équipe et la sortie', async () => {
    await renderMovie(base);
    expect(screen.getByText('2026 · 13+')).toBeTruthy();
    expect(screen.getByText('Science-fiction, Aventure')).toBeTruthy();
    // Équipe et Infos : montées à l'image suivante.
    expect(await screen.findByText('Denis Villeneuve')).toBeTruthy();
    expect(screen.getByText('Sortie')).toBeTruthy();
    expect(screen.getByText('En salle le 18 déc.')).toBeTruthy();
  });

  it('les actions ajoutent à la liste et marquent comme vu', async () => {
    await renderMovie(base);
    await fireEvent.press(screen.getByText('Ajouter à ma liste'));
    expect(toggleInList).toHaveBeenCalledWith(expect.objectContaining({ id: 'movie-1' }));
    await fireEvent.press(screen.getByText('Marquer comme vu'));
    expect(setMovieWatched).toHaveBeenCalledWith(expect.objectContaining({ id: 'movie-1' }), true);
  });

  it('un film vu affiche « Dans ma liste » et « Vu »', async () => {
    await renderMovie({
      ...base,
      userTitle: {
        titleId: 'movie-1',
        status: 'watched',
        addedAt: '2026-10-01T10:00:00Z',
        notificationsEnabled: true,
      },
    });
    expect(screen.getByText('Dans ma liste')).toBeTruthy();
    await fireEvent.press(screen.getByText('Vu'));
    expect(setMovieWatched).toHaveBeenCalledWith(expect.anything(), false);
  });
});
