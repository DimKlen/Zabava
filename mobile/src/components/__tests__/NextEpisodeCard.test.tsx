import { clampSwipe, settleSwipe, SWIPE_MIN, SWIPE_OPEN } from '../NextEpisodeCard';

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
