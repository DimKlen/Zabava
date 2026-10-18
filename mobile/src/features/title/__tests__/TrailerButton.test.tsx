import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import { Linking } from 'react-native';

import { TrailerButton, trailerHtml } from '../TrailerButton';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));
const mockFocusEffect = useFocusEffect as jest.Mock;

/** Simule la navigation : l'effet est lancé au focus, son nettoyage au départ de l'écran. */
let leaveScreen: (() => void) | undefined;
beforeEach(() => {
  leaveScreen = undefined;
  mockFocusEffect.mockImplementation((effect: () => (() => void) | undefined) => {
    leaveScreen = effect() ?? undefined;
  });
});

it('lit la bande-annonce dans la fiche, sans ouvrir YouTube', async () => {
  const openURL = jest.spyOn(Linking, 'openURL');
  await render(<TrailerButton titleId="movie-1" trailerKey="abc123" />);
  expect(screen.queryByTestId('trailer-player')).toBeNull();

  await fireEvent.press(screen.getByRole('button', { name: 'Lire la bande-annonce' }));

  const player = screen.getByTestId('trailer-player');
  expect(player.props.source.html).toContain('youtube-nocookie.com/embed/abc123?autoplay=1');
  expect(openURL).not.toHaveBeenCalled();
});

it('quitter la fiche arrête la lecture', async () => {
  await render(<TrailerButton titleId="movie-1" trailerKey="abc123" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lire la bande-annonce' }));
  expect(screen.getByTestId('trailer-player')).toBeTruthy();

  await act(() => leaveScreen?.());

  expect(screen.queryByTestId('trailer-player')).toBeNull();
  expect(screen.getByRole('button', { name: 'Lire la bande-annonce' })).toBeTruthy();
});

it('un lien vers YouTube depuis le lecteur s’ouvre hors de l’app', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<TrailerButton titleId="movie-1" trailerKey="abc123" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lire la bande-annonce' }));
  const { onShouldStartLoadWithRequest } = screen.getByTestId('trailer-player').props;

  expect(
    onShouldStartLoadWithRequest({ url: 'https://www.youtube-nocookie.com/embed/abc123?x' }),
  ).toBe(true);
  expect(onShouldStartLoadWithRequest({ url: 'https://www.youtube.com/watch?v=abc123' })).toBe(
    false,
  );
  expect(openURL).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc123');
});

it('page du lecteur : identifiant échappé', () => {
  expect(trailerHtml('a"b')).toContain('/embed/a%22b?');
});
