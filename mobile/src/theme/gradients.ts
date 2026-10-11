/**
 * Dégradés des affiches de remplacement — specs/docs/02-design-tokens.md §2.
 */
import { colors } from './tokens';

type Point = { x: number; y: number };

export type PosterGradient = {
  colors: readonly [string, string];
  start: Point;
  end: Point;
};

// 160° CSS et 200° CSS convertis pour expo-linear-gradient.
const deg160 = { start: { x: 0.33, y: 0 }, end: { x: 0.67, y: 1 } };
const deg200 = { start: { x: 0.67, y: 0 }, end: { x: 0.33, y: 1 } };

export const posterGradients: readonly PosterGradient[] = [
  { colors: [colors.accent700, colors.neutral900], ...deg160 },
  { colors: [colors.sectionGhost, colors.section], ...deg160 },
  { colors: [colors.neutral700, colors.neutral900], ...deg160 },
  { colors: [colors.accent800, colors.bg], ...deg160 },
  { colors: [colors.sectionGlow, colors.neutral900], ...deg160 },
  { colors: [colors.neutral600, colors.accent900], ...deg160 },
  { colors: [colors.accent600, colors.section], ...deg200 },
];

/**
 * Même calcul que le prototype : `(h * 31 + c) >>> 0` en flottants JS
 * (et non Math.imul), pour retrouver exactement les mêmes couleurs.
 */
export function hash(key: string): number {
  let h = 7;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

function gradientAt(index: number): PosterGradient {
  const gradient = posterGradients[index % posterGradients.length];
  if (!gradient) throw new Error(`Dégradé d'affiche introuvable : ${index}`);
  return gradient;
}

export function gradientFor(key: string): PosterGradient {
  return gradientAt(hash(key));
}

/** Tuiles de genre de Découvrir : dégradé `(index + 2) % 7`. */
export function genreGradient(index: number): PosterGradient {
  return gradientAt(index + 2);
}

/** Shimmer des squelettes : neutral900 → neutral800 → neutral900. */
export const shimmerColors = [colors.neutral900, colors.neutral800, colors.neutral900] as const;
