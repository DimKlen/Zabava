import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';
import { toggleInList } from '@/api/libraryActions';
import { useRecentSearches } from '@/store/recentSearches';

import { SearchScreen } from '../SearchScreen';

let mockParams: { tab?: string } = {};
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/api/http', () => ({ api: jest.fn() }));
jest.mock('@/api/libraryActions', () => ({
  toggleInList: jest.fn(),
  withLibraryType: <T,>(title: T) => title,
}));
jest.mock('@react-native-community/slider', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: View };
});

const mockApi = api as jest.MockedFunction<typeof api>;

const ZENDAYA = { id: 505710, name: 'Zendaya', knownFor: ['Dune', 'Euphoria', 'Challengers'] };
const ZEN = { id: 7, tmdbId: 7, type: 'tv', title: 'Zen', year: 2011 };
const DUNE = { id: 'movie-693134', tmdbId: 693134, type: 'movie', title: 'Dune', year: 2026 };

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

type Query = Record<string, unknown> | undefined;

function route(path: string, query: Query): unknown {
  if (path === '/me/watchlist') return [];
  if (path === '/trending') return [DUNE];
  if (path === '/discover/count') return { total: 2 };
  if (path === '/discover') return { results: [DUNE], total: 1, page: 1 };
  if (path === '/titles/badges') return [];
  if (path === '/me/recent-profiles') return [];
  if (path === '/users/search') {
    return { items: [{ username: 'lea.m', displayName: 'Léa Martin', followState: 'none' }] };
  }
  if (path === '/search') {
    const q = String(query?.q ?? '');
    const type = String(query?.type ?? 'all');
    if (q === 'zzzz') return { people: [], titles: [], page: 1, totalPages: 1 };
    const people = type === 'all' || type === 'person' ? [ZENDAYA] : [];
    const titles = type === 'person' ? [] : [{ ...ZEN, id: 'tv-7' }];
    return { people, titles, page: 1, totalPages: 1 };
  }
  throw new Error(`Route non simulée : ${path}`);
}

let client: QueryClient;

async function renderSearch() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>
        <SearchScreen />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

const searchCalls = () => mockApi.mock.calls.filter(([path]) => path === '/search');

beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  mockApi.mockImplementation(async (path, options) => route(path, options?.query));
  await act(() => useRecentSearches.setState({ recents: [] }));
});

afterEach(() => jest.useRealTimers());

describe('SearchScreen', () => {
  it('attend 300 ms après la frappe, puis montre Zendaya dans Tout et dans Personnes', async () => {
    jest.useFakeTimers();
    await renderSearch();
    await fireEvent.changeText(screen.getByLabelText('Rechercher'), 'z');
    await act(() => jest.advanceTimersByTime(200));
    await fireEvent.changeText(screen.getByLabelText('Rechercher'), 'zen');
    await act(() => jest.advanceTimersByTime(250));
    // Pendant la frappe : onglets et squelettes, aucune requête.
    expect(screen.getByText('Tout')).toBeTruthy();
    expect(searchCalls()).toHaveLength(0);
    await act(() => jest.advanceTimersByTime(60));

    expect(await screen.findByText('Zendaya')).toBeTruthy();
    expect(screen.getByText('Personne · Dune, Euphoria')).toBeTruthy();
    expect(screen.getByText('2011 · Série')).toBeTruthy();
    // Une seule requête, pour la saisie finale.
    expect(searchCalls()).toHaveLength(1);
    expect(searchCalls()[0]?.[1]?.query).toMatchObject({ q: 'zen', type: 'all', page: 1 });

    await fireEvent.press(screen.getByText('Personnes'));
    expect(await screen.findByText('Zendaya')).toBeTruthy();
    expect(screen.queryByText('Zen')).toBeNull();
  });

  it('ouvrir un résultat ajoute la requête aux récentes', async () => {
    await renderSearch();
    await fireEvent.changeText(screen.getByLabelText('Rechercher'), 'zen ');
    await fireEvent.press(await screen.findByText('Zendaya'));
    expect(router.push).toHaveBeenCalledWith('/person/505710');
    expect(useRecentSearches.getState().recents).toEqual(['zen']);
  });

  it('« + » fait un ajout rapide sans ouvrir la fiche', async () => {
    await renderSearch();
    await fireEvent.changeText(screen.getByLabelText('Rechercher'), 'zen');
    await screen.findByText('Zen');
    await fireEvent.press(screen.getByLabelText('Ajouter Zen'));
    expect(toggleInList).toHaveBeenCalledWith(expect.objectContaining({ id: 'tv-7', type: 'tv' }));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('la coche apparaît dès que le titre entre dans Ma liste', async () => {
    await renderSearch();
    await fireEvent.changeText(screen.getByLabelText('Rechercher'), 'zen');
    await screen.findByLabelText('Ajouter Zen');
    await waitFor(() => expect(client.isFetching()).toBe(0));
    // Ce que fait l'ajout rapide : mise à jour optimiste du cache de Ma liste.
    await act(() =>
      client.setQueryData(['watchlist', 'tv'], [{ id: 'tv-7', tmdbId: 7, title: 'Zen' }]),
    );
    expect(await screen.findByLabelText('Retirer Zen')).toBeTruthy();
  });

  it('une recherche récente remplit le champ et cherche tout de suite', async () => {
    await act(() => useRecentSearches.setState({ recents: ['zen', 'dune'] }));
    await renderSearch();
    expect(screen.getByText('Recherches récentes')).toBeTruthy();
    await fireEvent.press(screen.getByText('zen'));
    expect(screen.getByLabelText('Rechercher').props.value).toBe('zen');
    // Sans attendre le délai de frappe.
    await waitFor(() => expect(searchCalls()).toHaveLength(1), { timeout: 200 });
  });

  it('retirer une récente, puis tout effacer', async () => {
    await act(() => useRecentSearches.setState({ recents: ['zen', 'dune'] }));
    await renderSearch();
    await fireEvent.press(screen.getAllByLabelText('Retirer')[0]!);
    expect(useRecentSearches.getState().recents).toEqual(['dune']);
    await fireEvent.press(screen.getByText('Effacer'));
    expect(useRecentSearches.getState().recents).toEqual([]);
    expect(screen.queryByText('Recherches récentes')).toBeNull();
  });

  it('montre les tendances du moment sans saisie', async () => {
    await renderSearch();
    expect(screen.getByText('Tendances du moment')).toBeTruthy();
    expect(await screen.findByText('2026 · Film')).toBeTruthy();
  });

  it('sans résultat : message et accès à la recherche avancée', async () => {
    await renderSearch();
    await fireEvent.changeText(screen.getByLabelText('Rechercher'), 'zzzz');
    expect(await screen.findByText('Aucun résultat pour « zzzz »')).toBeTruthy();
    await fireEvent.press(screen.getByText('Essayer la recherche avancée'));
    expect(await screen.findByText('Voir les 2 résultats')).toBeTruthy();
  });

  it('valider au clavier ajoute la requête aux récentes', async () => {
    await renderSearch();
    await fireEvent.changeText(screen.getByLabelText('Rechercher'), 'dune');
    await fireEvent(screen.getByLabelText('Rechercher'), 'submitEditing');
    expect(useRecentSearches.getState().recents).toEqual(['dune']);
  });

  it('ouvrir les filtres retire le focus du champ (pas de clavier rouvert à la fermeture)', async () => {
    const blur = jest.spyOn(TextInput.prototype, 'blur');
    await renderSearch();
    await fireEvent.press(screen.getByLabelText('Filtres'));
    expect(blur).toHaveBeenCalled();
    blur.mockRestore();
  });

  it('recherche avancée appliquée : taper ne la quitte pas, « Effacer » oui', async () => {
    await renderSearch();
    await fireEvent.press(screen.getByLabelText('Filtres'));
    await fireEvent.press(await screen.findByText('Voir les 2 résultats'));
    expect(await screen.findByText('Recherche avancée')).toBeTruthy();
    expect(await screen.findByText('1 résultat')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Rechercher'), 'zen');
    await act(() => new Promise((resolve) => setTimeout(resolve, 350)));
    expect(screen.getByText('Modifier')).toBeTruthy();
    expect(searchCalls()).toHaveLength(0);

    await fireEvent.press(screen.getByText('Effacer'));
    expect(await screen.findByText('Zendaya')).toBeTruthy();
  });

  it('« @ » en premier passe sur Membres et cherche le pseudo sans « @ »', async () => {
    await renderSearch();
    await fireEvent.changeText(screen.getByLabelText('Rechercher'), '@le');
    expect(await screen.findByText('Léa Martin')).toBeTruthy();
    expect(mockApi).toHaveBeenCalledWith(
      '/users/search',
      expect.objectContaining({ query: { q: 'le', cursor: undefined } }),
    );
    expect(searchCalls()).toHaveLength(0);
    // Ouvrir un membre ne l'ajoute pas aux recherches récentes.
    await fireEvent.press(screen.getByText('Léa Martin'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/u/[username]',
      params: { username: 'lea.m' },
    });
    expect(useRecentSearches.getState().recents).toEqual([]);
  });

  it('« Chercher un membre » remplit « @ » et ouvre Membres', async () => {
    await renderSearch();
    await fireEvent.press(screen.getByText('Chercher un membre'));
    expect(screen.getByLabelText('Rechercher').props.value).toBe('@');
    expect(await screen.findByText('Tape au moins 2 caractères du pseudo ou du nom.')).toBeTruthy();
  });

  it('?tab=members ouvre directement sur Membres', async () => {
    mockParams = { tab: 'members' };
    await renderSearch();
    expect(screen.getByLabelText('Rechercher').props.value).toBe('@');
    expect(screen.getByText('Membres')).toBeTruthy();
  });
});
