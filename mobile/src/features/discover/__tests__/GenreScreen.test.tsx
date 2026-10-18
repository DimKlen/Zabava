import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';

import { GenreScreen } from '../GenreScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/api/http', () => ({ api: jest.fn() }));
jest.mock('@/api/libraryActions', () => ({ toggleInList: jest.fn(), withLibraryType: jest.fn() }));

const mockApi = api as jest.MockedFunction<typeof api>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function discoverCalls() {
  return mockApi.mock.calls
    .filter(([path]) => path === '/discover')
    .map(([, options]) => options?.query);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.mockImplementation(async (path) => {
    if (path === '/me/watchlist' || path === '/titles/badges') return [];
    if (path === '/me/profile') return { providerIds: [] };
    if (path === '/discover') {
      return { results: [{ id: 'movie-1', tmdbId: 1, type: 'movie', title: 'Flow' }], total: 1 };
    }
    throw new Error(`Route non simulée : ${path}`);
  });
});

async function renderGenre() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>
        <GenreScreen type="movie" genre="animation" />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
}

it('liste par genre : plus récents par défaut, puis tri et filtres', async () => {
  await renderGenre();
  expect(await screen.findByText('1 film')).toBeTruthy();
  expect(discoverCalls()[0]).toMatchObject({ genres: 'animation', sort: 'recent' });

  await fireEvent.press(screen.getByText('Mieux notés'));
  await fireEvent.press(screen.getByText('Sur mes plateformes'));
  await fireEvent.press(screen.getByText('Note 7+'));

  expect(discoverCalls().at(-1)).toMatchObject({
    genres: 'animation',
    sort: 'rating',
    providers: 'mine',
    minRating: 7,
  });
  expect(screen.getByRole('button', { name: 'Note 7+', selected: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Plus récents', selected: false })).toBeTruthy();
});
