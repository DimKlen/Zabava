import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setEpisodesWatched, toggleInList } from '@/api/libraryActions';
import type { TitleDetail } from '@/api/titles';
import { DialogHost } from '@/components/Dialog';
import { formatRelativeDay, formatShortDate, formatTime } from '@/domain/format';
import type { SeriesEpisode } from '@/domain/series';
import { useUiStore } from '@/store/ui';

import { SeriesScreen } from '../SeriesScreen';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), canGoBack: () => true },
  useSegments: () => ['title'],
}));
jest.mock('@/api/profile', () => ({
  useProfile: () => ({ data: { region: 'CA', providerIds: [230], spoilerProtection: false } }),
}));
jest.mock('@/api/watchlist', () => ({ useSeriesWatchlist: () => ({ data: [] }) }));
jest.mock('@/api/libraryActions', () => ({
  removeFromList: jest.fn(),
  setEpisodesWatched: jest.fn(),
  setSeriesAbandoned: jest.fn(),
  setTitleAlerts: jest.fn(),
  toggleInList: jest.fn(),
}));

const SEEN = '2026-10-01T20:00:00.000Z';
const ep = (season: number, number: number, extra: Partial<SeriesEpisode> = {}): SeriesEpisode => ({
  id: season * 100 + number,
  season,
  number,
  name: `Épisode ${season}-${number}`,
  airDate: '2026-09-01',
  runtime: 32,
  ...extra,
});

let mockEpisodes: SeriesEpisode[] = [];
jest.mock('@/api/episodes', () => ({
  useEpisodes: () => ({ data: mockEpisodes, isError: false, refetch: jest.fn() }),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const bear: TitleDetail & { type: 'tv' } = {
  id: 'tv-136315',
  tmdbId: 136315,
  type: 'tv',
  title: 'The Bear',
  year: 2022,
  genres: ['Drame', 'Comédie'],
  status: 'En cours',
  network: 'FX',
  seasons: [
    { number: 0, episodeCount: 1 },
    { number: 1, episodeCount: 8 },
    { number: 2, episodeCount: 2 },
  ],
  availability: { sub: [{ id: 337, name: 'Disney+', short: 'D+' }], rent: [], buy: [] },
  cast: [],
  directors: [],
  directorIds: [],
  writers: [],
  creators: ['Christopher Storer'],
  networks: ['FX'],
  collection: [],
  similar: [],
  userTitle: {
    titleId: 'tv-136315',
    status: 'following',
    addedAt: '2026-08-01T10:00:00Z',
    notificationsEnabled: true,
  },
};

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 10, 12, 0) }));
afterAll(() => jest.useRealTimers());

beforeEach(async () => {
  jest.clearAllMocks();
  mockEpisodes = [
    ep(0, 1),
    ...Array.from({ length: 8 }, (_, i) => ep(1, i + 1, i < 4 ? { watchedAt: SEEN } : {})),
    ep(2, 1, { airDate: '2026-10-14', airstamp: '2026-10-15T01:00:00Z' }),
    ep(2, 2, { airDate: undefined }),
  ];
  await act(() => useUiStore.setState({ dialog: null, dialogOpen: false }));
});

async function renderSeries(series: TitleDetail & { type: 'tv' } = bear, season?: number) {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <SeriesScreen series={series} initialSeason={season} />
      <DialogHost />
    </SafeAreaProvider>,
  );
}

describe('SeriesScreen', () => {
  it('méta, prochain épisode daté, bouton « Suivie », saison du prochain épisode', async () => {
    await renderSeries();
    expect(screen.getByText('2022 · Disney+ · En cours')).toBeTruthy();
    // Jour local de l'heure de diffusion (14 oct. à Toronto, 15 oct. en UTC sur la CI).
    expect(
      screen.getByText(
        `Prochain épisode : S02 E01 le ${formatShortDate(new Date('2026-10-15T01:00:00Z'))}`,
      ),
    ).toBeTruthy();
    expect(screen.getByText('Suivie')).toBeTruthy();
    // Saisons 1, 2 puis Spéciaux ; saison par défaut = celle du prochain épisode (S01 E05).
    expect(screen.getByText('Spéciaux')).toBeTruthy();
    expect(screen.getAllByText('Saison 1')).toHaveLength(2);
    expect(screen.getByText('4/8 vus')).toBeTruthy();
    expect(screen.getByText('Tout marquer comme vu')).toBeTruthy();
  });

  it('hors liste : « Suivre » suit la série', async () => {
    await renderSeries({ ...bear, userTitle: undefined });
    await fireEvent.press(screen.getByText('Suivre'));
    expect(toggleInList).toHaveBeenCalledWith(expect.objectContaining({ id: 'tv-136315' }));
  });

  it('cocher E08 alors que E05 à E07 ne sont pas vus ouvre le dialogue', async () => {
    await renderSeries();
    const checks = screen.getAllByLabelText('Marquer comme vu');
    // E05 à E08 non vus : la 4e coche non vue est E08.
    await fireEvent.press(checks[3] as never);
    expect(screen.getByText('Marquer aussi les 3 épisodes précédents ?')).toBeTruthy();

    await fireEvent.press(screen.getByText('Oui'));
    expect(setEpisodesWatched).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tv-136315' }),
      [105, 106, 107, 108].map((id) => expect.objectContaining({ id })),
      true,
    );
  });

  it('« Seulement celui-ci » ne coche que l’épisode touché', async () => {
    await renderSeries();
    await fireEvent.press(screen.getAllByLabelText('Marquer comme vu')[3] as never);
    await fireEvent.press(screen.getByText('Seulement celui-ci'));
    expect(setEpisodesWatched).toHaveBeenCalledWith(
      expect.anything(),
      [expect.objectContaining({ id: 108 })],
      true,
    );
  });

  it('toucher un épisode vu le décoche', async () => {
    await renderSeries();
    await fireEvent.press(screen.getAllByLabelText('Marquer comme non vu')[0] as never);
    expect(setEpisodesWatched).toHaveBeenCalledWith(
      expect.anything(),
      [expect.objectContaining({ id: 101 })],
      false,
    );
  });

  it('« Tout marquer comme vu » ne coche que les épisodes diffusés non vus', async () => {
    await renderSeries();
    await fireEvent.press(screen.getByText('Tout marquer comme vu'));
    expect(setEpisodesWatched).toHaveBeenCalledWith(
      expect.anything(),
      [105, 106, 107, 108].map((id) => expect.objectContaining({ id })),
      true,
    );
  });

  it('saison 2 : épisode à venir sans coche, avec jour et heure', async () => {
    await renderSeries(bear, 2);
    expect(screen.getByText('0/2 vus')).toBeTruthy();
    // Aucun épisode diffusé : pas de bouton de saison, pas de coche.
    expect(screen.queryByText('Tout marquer comme vu')).toBeNull();
    expect(screen.queryByLabelText('Marquer comme vu')).toBeNull();
    const airing = new Date('2026-10-15T01:00:00Z');
    expect(
      screen.getByText(`${formatRelativeDay(airing, new Date())} · ${formatTime(airing)}`),
    ).toBeTruthy();
  });

  it('la ligne d’un épisode ouvre la fiche épisode', async () => {
    await renderSeries();
    await fireEvent.press(screen.getByText('E05 · Épisode 1-5'));
    expect(screen.getByTestId('episode-sheet')).toBeTruthy();
    expect(screen.getByText('S01 E05 · The Bear')).toBeTruthy();
    expect(screen.getAllByText('1 septembre 2026 · 32 min').length).toBeGreaterThan(1);
  });

  it('onglet Infos : Créateurs et Saisons', async () => {
    await renderSeries();
    await fireEvent.press(screen.getByText('Infos'));
    expect(screen.getByText('Créateurs')).toBeTruthy();
    expect(screen.getByText('Christopher Storer')).toBeTruthy();
    expect(screen.getByText('2 saisons · 10 épisodes')).toBeTruthy();
  });
});
