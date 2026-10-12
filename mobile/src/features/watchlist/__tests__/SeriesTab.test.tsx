import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { setEpisodesWatched } from '@/api/libraryActions';
import { PROTOTYPE_TV, protoSeries } from '@/domain/__fixtures__/prototypeSeries';
import { DEFAULT_COLLAPSED, type LibrarySeries } from '@/domain/seriesList';
import { useUiStore } from '@/store/ui';

import { SeriesTab } from '../SeriesTab';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn() },
  useScrollToTop: jest.fn(),
}));
jest.mock('@/api/profile', () => ({
  useProfile: () => ({ data: { providerIds: [8, 230, 119], spoilerProtection: false } }),
}));
jest.mock('@/api/libraryActions', () => ({
  removeFromList: jest.fn(),
  setEpisodesWatched: jest.fn(),
  setSeriesAbandoned: jest.fn(),
}));

let mockSeries: LibrarySeries[] | undefined = PROTOTYPE_TV;
jest.mock('@/api/watchlist', () => ({
  useSeriesWatchlist: () => ({ data: mockSeries, isError: false, refetch: jest.fn() }),
}));

beforeAll(() => jest.useFakeTimers({ now: new Date(2026, 9, 10, 12, 0) }));
afterAll(() => jest.useRealTimers());

beforeEach(async () => {
  jest.clearAllMocks();
  mockSeries = PROTOTYPE_TV;
  await act(() => useUiStore.setState({ collapsedSections: { ...DEFAULT_COLLAPSED } }));
});

async function renderTab(type: 'tv' | 'anime' = 'tv') {
  await render(<SeriesTab type={type} />);
  await act(() => jest.advanceTimersByTime(700));
}

describe('SeriesTab', () => {
  it('affiche 3 squelettes de carte pendant le chargement', async () => {
    await render(<SeriesTab type="tv" />);
    expect(screen.getByTestId('series-skeletons')).toBeTruthy();
  });

  it('six sections dans l’ordre ; Terminées et Abandonnées repliées', async () => {
    await renderTab();
    expect(
      screen.getByText("Coche pour avancer · glisse une carte vers la gauche pour plus d'actions"),
    ).toBeTruthy();
    for (const title of [
      'À regarder',
      'Pas regardé depuis un moment',
      'Pas encore commencées',
      'À jour',
      'Terminées',
      'Abandonnées',
    ]) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getAllByTestId('next-episode-card')).toHaveLength(3);
    expect(screen.getByText('Prochain épisode le 14 oct.')).toBeTruthy();
    expect(screen.getByText('En attente de la saison 3')).toBeTruthy();
    // Repliées par défaut.
    expect(screen.queryByText('Terminée · 24 épisodes vus')).toBeNull();
    expect(screen.queryByText('Abandonnée · 21/42 vus')).toBeNull();
  });

  it('déplier une section la garde ouverte pendant la session', async () => {
    await renderTab();
    await fireEvent.press(screen.getByText('Terminées'));
    expect(screen.getByText('Terminée · 24 épisodes vus')).toBeTruthy();
    expect(useUiStore.getState().collapsedSections.done).toBe(false);
  });

  it('la coche de la carte marque le prochain épisode, sans dialogue', async () => {
    await renderTab();
    expect(screen.getByText('S04 E03 · Épisode 4-3')).toBeTruthy();
    expect(screen.getByText('8 épisodes restants')).toBeTruthy();
    // Le geste de la coche n'est pas simulable : son action d'accessibilité fait la même chose.
    const [card] = screen.getAllByTestId('next-episode-card');
    if (!card) throw new Error('carte absente');
    await fireEvent(card, 'onAccessibilityAction', { nativeEvent: { actionName: 'check' } });
    expect(setEpisodesWatched).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tv-bear' }),
      [expect.objectContaining({ season: 4, number: 3 })],
      true,
    );
  });

  it('« Commencer » ouvre la fiche à la saison 1', async () => {
    await renderTab();
    await fireEvent.press(screen.getByText('Commencer'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/title/[type]/[id]',
      params: { type: 'tv', id: String(protoSeries('shogun').tmdbId), season: '1' },
    });
  });

  it('sans série : « Aucune série suivie » / « Aucun animé suivi »', async () => {
    mockSeries = [];
    await renderTab();
    expect(screen.getByText('Aucune série suivie')).toBeTruthy();
    await fireEvent.press(screen.getByText('Découvrir des séries'));
    expect(router.navigate).toHaveBeenCalledWith('/(tabs)/discover');

    await renderTab('anime');
    expect(screen.getByText('Aucun animé suivi')).toBeTruthy();
  });

  it('pas de ligne d’aide sans carte « À regarder »', async () => {
    mockSeries = [protoSeries('shogun')];
    await renderTab();
    expect(screen.queryByText(/Coche pour avancer/)).toBeNull();
  });
});
