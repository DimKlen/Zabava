import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { api } from '@/api/http';

import { openPerson } from '../openPerson';
import { PersonScreen } from '../PersonScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));
jest.mock('@/api/http', () => ({ api: jest.fn() }));
jest.mock('@/api/libraryActions', () => ({ toggleInList: jest.fn(), withLibraryType: jest.fn() }));

const mockApi = api as jest.MockedFunction<typeof api>;

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const PERSON = {
  id: 505710,
  name: 'Zendaya',
  gender: 1,
  birthday: '1996-09-01',
  placeOfBirth: 'Oakland, California, USA',
  credits: [
    {
      id: 'movie-1',
      tmdbId: 1,
      type: 'movie',
      title: 'Dune',
      popularity: 90,
      releaseDate: '2021-09-15',
    },
    {
      id: 'movie-2',
      tmdbId: 2,
      type: 'movie',
      title: 'Challengers',
      popularity: 40,
      releaseDate: '2024-04-26',
    },
    {
      id: 'tv-3',
      tmdbId: 3,
      type: 'tv',
      title: 'Euphoria',
      popularity: 80,
      releaseDate: '2019-06-16',
    },
  ],
  roles: [
    { title: 'Dune', character: 'Chani' },
    { title: 'Euphoria', character: 'Rue Bennett' },
  ],
};

async function renderPerson(person: object) {
  mockApi.mockImplementation(async (path) => {
    if (path.startsWith('/people/')) return person;
    if (path === '/me/profile') return { providerIds: [] };
    return [];
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>
        <PersonScreen id={505710} />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );
  await screen.findByText(PERSON.name);
}

const posterTitles = () =>
  screen.getAllByTestId('poster').map((poster) => poster.props.accessibilityLabel as string);

beforeEach(() => jest.clearAllMocks());

describe('PersonScreen', () => {
  it('identité, naissance accordée au genre et biographie générée sans biographie TMDB', async () => {
    await renderPerson(PERSON);
    expect(screen.getByText('Née le 1er septembre 1996 à Oakland, États-Unis')).toBeTruthy();
    expect(
      // La copie de mesure du « Voir plus » est masquée aux lecteurs d'écran.
      screen.getByText('Zendaya est connue pour Dune (Chani), Euphoria (Rue Bennett)…'),
    ).toBeTruthy();
    expect(screen.getByText('Filmographie')).toBeTruthy();
  });

  it('Films par popularité, puis Plus récent, puis Séries', async () => {
    await renderPerson(PERSON);
    expect(posterTitles()).toEqual(['Dune', 'Challengers']);
    await fireEvent.press(screen.getByText('Plus récent'));
    expect(posterTitles()).toEqual(['Challengers', 'Dune']);
    await fireEvent.press(screen.getByText('Séries'));
    expect(posterTitles()).toEqual(['Euphoria']);
  });

  it('catégorie vide et données de naissance absentes', async () => {
    await renderPerson({ ...PERSON, birthday: undefined, placeOfBirth: undefined, credits: [] });
    expect(screen.getByText('Date et lieu de naissance non renseignés')).toBeTruthy();
    expect(screen.getByText('Aucun titre dans cette catégorie.')).toBeTruthy();
  });
});

describe('ouverture depuis un nom', () => {
  it('nom tout de suite pendant le chargement, puis la fiche', async () => {
    let answer: (value: unknown) => void = () => undefined;
    mockApi.mockImplementation((path) =>
      path.startsWith('/people/')
        ? new Promise((resolve) => {
            answer = resolve;
          })
        : Promise.resolve(path === '/me/profile' ? { providerIds: [] } : []),
    );
    openPerson({ id: 505710, name: 'Zendaya' });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    await render(
      <SafeAreaProvider initialMetrics={METRICS}>
        <QueryClientProvider client={client}>
          <PersonScreen id={505710} />
        </QueryClientProvider>
      </SafeAreaProvider>,
    );

    const name = screen.getByRole('header', { name: 'Zendaya' });
    expect(screen.queryByText('Filmographie')).toBeNull();

    await act(() => answer(PERSON));
    expect(await screen.findByText('Filmographie')).toBeTruthy();
    // Identité restée en place (photo non remontée) : même élément qu'au chargement.
    expect(screen.getByRole('header', { name: 'Zendaya' })).toBe(name);
  });
});
