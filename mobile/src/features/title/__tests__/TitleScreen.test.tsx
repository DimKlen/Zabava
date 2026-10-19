import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTitle } from '@/api/titles';

import { openTitle } from '../openTitle';
import { TitleScreen } from '../TitleScreen';

jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/api/titles', () => ({ useTitle: jest.fn(), prefetchTitle: jest.fn() }));

const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const refetch = jest.fn();

function mockQuery(state: { isError: boolean; isFetching: boolean }) {
  jest.mocked(useTitle).mockReturnValue({ data: undefined, refetch, ...state } as never);
}

async function renderTitle() {
  await render(
    <SafeAreaProvider initialMetrics={metrics}>
      <TitleScreen type="movie" tmdbId={550} />
    </SafeAreaProvider>,
  );
}

it('affiche « Impossible de charger » et relance avec « Réessayer »', async () => {
  mockQuery({ isError: true, isFetching: false });
  await renderTitle();
  expect(screen.getByText('Vérifie ta connexion et réessaie.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Réessayer'));
  expect(refetch).toHaveBeenCalled();
});

it('reprend l’état de chargement pendant la nouvelle tentative', async () => {
  mockQuery({ isError: true, isFetching: true });
  await renderTitle();
  expect(screen.queryByText('Impossible de charger')).toBeNull();
});

it('ouverte depuis une liste : affiche et titre tout de suite, le reste en squelette', async () => {
  openTitle({ type: 'movie', tmdbId: 550, title: 'Fight Club', posterPath: '/fc.jpg', year: 1999 });
  mockQuery({ isError: false, isFetching: true });
  await renderTitle();
  expect(screen.getByRole('header', { name: 'Fight Club' })).toBeTruthy();
  expect(screen.getByTestId('title-header-skeleton', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByTestId('title-skeleton')).toBeTruthy();
  // La cloche attend la fiche (suivi de l'utilisateur).
  expect(screen.queryByLabelText('Activer les alertes')).toBeNull();
  expect(screen.getByLabelText('Retour')).toBeTruthy();
});
