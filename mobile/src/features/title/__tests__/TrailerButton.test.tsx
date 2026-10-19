import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import { Linking } from 'react-native';

import { TRAILER_LOADING_TIMEOUT_MS, TrailerButton, trailerHtml } from '../TrailerButton';

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
  expect(player.props.source.html).toContain('videoId:"abc123"');
  expect(player.props.source.html).toContain('https://www.youtube.com/iframe_api');
  expect(openURL).not.toHaveBeenCalled();
});

it('au tap : voile et indicateur tout de suite, retirés quand la vidéo joue', async () => {
  await render(<TrailerButton titleId="movie-1" trailerKey="abc123" />);
  await fireEvent.press(screen.getByRole('button', { name: 'Lire la bande-annonce' }));
  expect(screen.getByTestId('trailer-loading')).toBeTruthy();
  const player = screen.getByTestId('trailer-player');
  // Pas de barre de défilement pendant le chargement de la page.
  expect(player.props.showsVerticalScrollIndicator).toBe(false);
  expect(player.props.scrollEnabled).toBe(false);

  await act(() => player.props.onMessage({ nativeEvent: { data: 'playing' } }));

  expect(screen.queryByTestId('trailer-loading')).toBeNull();
  expect(screen.getByTestId('trailer-player')).toBeTruthy();
});

it('sans signal du lecteur, le voile s’efface après le délai', async () => {
  jest.useFakeTimers();
  try {
    await render(<TrailerButton titleId="movie-1" trailerKey="abc123" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Lire la bande-annonce' }));
    expect(screen.getByTestId('trailer-loading')).toBeTruthy();

    await act(() => jest.advanceTimersByTime(TRAILER_LOADING_TIMEOUT_MS));

    expect(screen.queryByTestId('trailer-loading')).toBeNull();
  } finally {
    jest.useRealTimers();
  }
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
  const html = trailerHtml('a"b</script>');
  expect(html).toContain(String.raw`videoId:"a\"b\u003c/script>"`);
  expect(html.match(/<\/script>/g)).toHaveLength(1);
});
