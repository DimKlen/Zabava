import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setMovieReview, setMovieWatched } from '@/api/libraryActions';
import { StarRating } from '@/components/StarRating';
import { closeRatingSheet, openRatingSheet, useUiStore } from '@/store/ui';

import { RatingSheetHost } from '../RatingSheet';

jest.mock('@/api/libraryActions', () => ({
  setMovieWatched: jest.fn(),
  setMovieReview: jest.fn(),
}));

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const odyssey = {
  id: 'movie-1368337',
  tmdbId: 1368337,
  type: 'movie' as const,
  title: "L'Odyssée",
};

async function showSheet() {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <RatingSheetHost />
    </SafeAreaProvider>,
  );
}

/** Touche la rangée d'étoiles à la position `x` (largeur 300). */
async function touchStars(x: number) {
  const stars = screen.getByLabelText('Note');
  await fireEvent(stars, 'layout', {
    nativeEvent: { layout: { width: 300, height: 48, x: 0, y: 0 } },
  });
  await fireEvent.press(stars, { nativeEvent: { locationX: x } });
}

beforeEach(async () => {
  jest.clearAllMocks();
  await act(() => useUiStore.setState({ ratingSheet: null, ratingSheetOpen: false }));
});

describe('StarRating', () => {
  it('10 étoiles ; la note suit le doigt ; retoucher la note en cours l’efface', async () => {
    const onChange = jest.fn();
    const { rerender } = await render(
      <StarRating value={undefined} onChange={onChange} size={20} />,
    );
    await touchStars(209); // 7e étoile sur 10 (30 de large chacune)
    expect(onChange).toHaveBeenLastCalledWith(7);
    await rerender(<StarRating value={7} onChange={onChange} size={20} />);
    await touchStars(200);
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    await touchStars(299);
    expect(onChange).toHaveBeenLastCalledWith(10);
    await touchStars(1);
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it('lecteur d’écran : réglable, « augmenter » / « diminuer »', async () => {
    const onChange = jest.fn();
    await render(<StarRating value={7} onChange={onChange} size={20} />);
    const stars = screen.getByLabelText('Note');
    expect(stars.props.accessibilityValue).toMatchObject({ now: 7, text: '7 sur 10' });
    await fireEvent(stars, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(8);
    await fireEvent(stars, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange).toHaveBeenLastCalledWith(6);
  });
});

describe('RatingSheet', () => {
  it('« Marquer comme vu » : une note et un commentaire, puis « Enregistrer »', async () => {
    await act(() => openRatingSheet({ title: odyssey, mode: 'watch' }));
    await showSheet();
    expect(screen.getByText('Ta note')).toBeTruthy();
    expect(screen.getByText("L'Odyssée")).toBeTruthy();
    expect(screen.getByText('Pas de note')).toBeTruthy();
    expect(screen.getByText('Visible seulement par toi.')).toBeTruthy();

    await touchStars(239);
    expect(screen.getByText('8/10')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Commentaire'), 'Grandiose');
    await fireEvent.press(screen.getByText('Enregistrer'));

    expect(setMovieWatched).toHaveBeenCalledWith(odyssey, true, {
      rating: 8,
      comment: 'Grandiose',
    });
    expect(useUiStore.getState().ratingSheetOpen).toBe(false);
  });

  it('« Passer » : vu, sans nouvelle note ; tout est facultatif', async () => {
    await act(() => openRatingSheet({ title: odyssey, mode: 'watch' }));
    await showSheet();
    await fireEvent.press(screen.getByText('Passer'));
    expect(setMovieWatched).toHaveBeenCalledWith(odyssey, true, undefined);
    expect(setMovieReview).not.toHaveBeenCalled();
  });

  it('fermer la sheet (toucher le fond) marque vu sans note, une seule fois', async () => {
    await act(() => openRatingSheet({ title: odyssey, mode: 'watch' }));
    await showSheet();
    await fireEvent.press(screen.getByLabelText('Fermer'));
    expect(screen.queryByText('Passer')).toBeNull();
    expect(setMovieWatched).toHaveBeenCalledTimes(1);
    expect(setMovieWatched).toHaveBeenCalledWith(odyssey, true, undefined);
  });

  it('« Ma note » : pré-remplie ; « Annuler » ne change rien, « Enregistrer » la change', async () => {
    await act(() => openRatingSheet({ title: odyssey, mode: 'edit', rating: 6, comment: 'Bien' }));
    await showSheet();
    expect(screen.getByText('6/10')).toBeTruthy();
    expect(screen.getByLabelText('Commentaire').props.value).toBe('Bien');
    await fireEvent.press(screen.getByText('Annuler'));
    expect(setMovieReview).not.toHaveBeenCalled();
    expect(setMovieWatched).not.toHaveBeenCalled();

    await act(() => closeRatingSheet());
    await act(() => openRatingSheet({ title: odyssey, mode: 'edit', rating: 6, comment: 'Bien' }));
    await touchStars(299);
    await fireEvent.press(screen.getByText('Enregistrer'));
    expect(setMovieReview).toHaveBeenCalledWith(odyssey, { rating: 10, comment: 'Bien' });
  });
});
