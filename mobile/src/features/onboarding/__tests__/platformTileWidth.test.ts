import { platformTileWidth } from '../PlatformsScreen';

describe('platformTileWidth', () => {
  it.each([360, 390, 392.727, 411.43, 430])('3 tuiles tiennent sur une rangée (%p pt)', (width) => {
    const tile = platformTileWidth(width);
    expect(Number.isInteger(tile)).toBe(true);
    // Marges 16 de chaque côté et 2 écarts de 10.
    expect(3 * tile + 2 * 10 + 2 * 16).toBeLessThanOrEqual(width);
  });

  it('écran du prototype (390 pt) : 112 pt', () => {
    expect(platformTileWidth(390)).toBe(112);
  });
});
