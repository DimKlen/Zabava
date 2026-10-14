import { gridRowLayout } from '../PosterGrid';

// Affiche de 114 pt (fenêtre de 390) : rangée 114 × 1,5 + 8 = 179.
it('place chaque rangée sans la mesurer', () => {
  expect(gridRowLayout(0, 114, 12)).toEqual({ index: 0, length: 179, offset: 12 });
  expect(gridRowLayout(2, 114, 12)).toEqual({ index: 2, length: 179, offset: 12 + 2 * 179 });
});

it('décale les rangées de la hauteur de l’en-tête', () => {
  expect(gridRowLayout(1, 114, 12 + 100)).toEqual({ index: 1, length: 179, offset: 112 + 179 });
});
