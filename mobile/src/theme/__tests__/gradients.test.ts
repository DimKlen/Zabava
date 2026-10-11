import { genreGradient, gradientFor, hash, posterGradients } from '../gradients';
import { colors } from '../tokens';

// Copie conforme de la fonction du prototype (specs/reference/app.js).
const prototypeHash = (s: string) =>
  [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

describe('hash', () => {
  it.each([
    'odyssey',
    'sinners',
    'dune3',
    'movie-693134',
    'tv-136315' + 4 + '-' + 3,
    'Zendaya',
    'Élise Côté',
    'Ånime 🎬 ✓',
    '',
  ])('donne le même résultat que le prototype pour %p', (key) => {
    expect(hash(key)).toBe(prototypeHash(key));
  });

  it('reste un entier non signé sur 32 bits pour une clé longue', () => {
    const value = hash('x'.repeat(10_000));
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(2 ** 32);
  });
});

describe('posterGradients', () => {
  it("suit l'ordre des 7 dégradés de specs/docs/02 §2", () => {
    expect(posterGradients.map((g) => g.colors)).toEqual([
      [colors.accent700, colors.neutral900],
      [colors.sectionGhost, colors.section],
      [colors.neutral700, colors.neutral900],
      [colors.accent800, colors.bg],
      [colors.sectionGlow, colors.neutral900],
      [colors.neutral600, colors.accent900],
      [colors.accent600, colors.section],
    ]);
  });

  it('oriente le dernier dégradé à 200° et les autres à 160°', () => {
    posterGradients.slice(0, 6).forEach((g) => {
      expect(g.start).toEqual({ x: 0.33, y: 0 });
      expect(g.end).toEqual({ x: 0.67, y: 1 });
    });
    expect(posterGradients[6]?.start).toEqual({ x: 0.67, y: 0 });
    expect(posterGradients[6]?.end).toEqual({ x: 0.33, y: 1 });
  });

  it('choisit le dégradé hash(clé) % 7', () => {
    for (const key of ['odyssey', 'sinners', 'dune3', 'Zendaya']) {
      expect(gradientFor(key)).toBe(posterGradients[prototypeHash(key) % 7]);
    }
  });

  it('décale les tuiles de genre de 2', () => {
    expect(genreGradient(0)).toBe(posterGradients[2]);
    expect(genreGradient(5)).toBe(posterGradients[0]);
  });
});
