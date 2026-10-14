import { act, render } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { useUiStore } from '@/store/ui';

import {
  clampSwipe,
  NextEpisodeCard,
  settleSwipe,
  SWIPE_MIN,
  SWIPE_OPEN,
} from '../NextEpisodeCard';

describe('swipe de la carte « prochain épisode »', () => {
  it.each([
    [0, -20, -20],
    [0, -200, SWIPE_MIN],
    [0, 40, 0],
    [SWIPE_OPEN, -50, SWIPE_MIN],
    [SWIPE_OPEN, 100, -50],
    [SWIPE_OPEN, 200, 0],
  ])('départ %p, déplacement %p → %p', (start, translation, expected) => {
    expect(clampSwipe(start, translation)).toBe(expected);
  });

  it.each([
    [-61, SWIPE_OPEN],
    [-170, SWIPE_OPEN],
    [-60, 0],
    [-20, 0],
    [0, 0],
  ])('relâchée à %p → %p', (position, expected) => {
    expect(settleSwipe(position)).toBe(expected);
  });
});

describe('retour Android', () => {
  const card = (
    <NextEpisodeCard
      id="tv-1"
      seriesName="The Bear"
      episodeLabel="S01 E04 · Des Chiens"
      remainingLabel="43 épisodes restants"
      progress={0.1}
      stillKey="tv-11-4"
      onPress={jest.fn()}
      onCheck={jest.fn()}
      onAbandon={jest.fn()}
      onRemove={jest.fn()}
    />
  );

  afterEach(() => {
    jest.restoreAllMocks();
    useUiStore.setState({ swipedCardId: null });
  });

  it('referme la carte swipée au lieu de quitter l’écran', async () => {
    const add = jest.spyOn(BackHandler, 'addEventListener');
    useUiStore.setState({ swipedCardId: 'tv-1' });
    await render(card);

    const handler = add.mock.calls.at(-1)?.[1];
    let handled: boolean | null | undefined;
    await act(() => {
      // Événement factice : le gestionnaire ne le lit pas.
      handled = handler?.({} as never);
    });
    expect(handled).toBe(true);
    expect(useUiStore.getState().swipedCardId).toBeNull();
  });

  it('laisse le retour à la navigation quand la carte est fermée', async () => {
    const add = jest.spyOn(BackHandler, 'addEventListener');
    await render(card);
    expect(add).not.toHaveBeenCalled();
  });
});
