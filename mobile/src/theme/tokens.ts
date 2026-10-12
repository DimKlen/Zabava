/**
 * Design system Nocturne — valeurs exactes de specs/docs/02-design-tokens.md.
 * Seul endroit du code où les littéraux de couleur sont autorisés.
 * Unité : point (pt), à 390 pt de large.
 */

// §1 Couleurs
export const colors = {
  // Rôles
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  accent: '#9184d9',
  accent2: '#a7a1db',
  divider: 'rgba(233,233,237,0.16)',

  // Gamme neutre
  neutral100: '#f3f5fe',
  neutral200: '#e4e7f5',
  neutral300: '#cfd3e5',
  neutral400: '#b2b6ca',
  neutral500: '#9397ab',
  neutral600: '#75798c',
  neutral700: '#595d6c',
  neutral800: '#3f424d',
  neutral900: '#292b31',

  // Gamme accent
  accent100: '#f5f4ff',
  accent200: '#e7e5fe',
  accent300: '#d2cefd',
  accent400: '#b5abfc',
  accent500: '#968ae0',
  accent600: '#796cbf',
  accent700: '#5d5294',
  accent800: '#423a6a',
  accent900: '#2b2741',

  // Section (dégradés d'affiches uniquement)
  section: '#262a60',
  sectionGlow: '#353b80',
  sectionGhost: '#4c5397',

  // Transparences pré-calculées
  bgA80: 'rgba(22,24,38,0.80)',
  bgA75: 'rgba(22,24,38,0.75)',
  bgA60: 'rgba(22,24,38,0.60)',
  bgA25: 'rgba(22,24,38,0.25)',
  bgA20: 'rgba(22,24,38,0.20)',
  scrim: 'rgba(41,43,49,0.60)',
  accentA12: 'rgba(145,132,217,0.12)',
  accentA22: 'rgba(145,132,217,0.22)',
  accentA10: 'rgba(145,132,217,0.10)',
  accentA18: 'rgba(145,132,217,0.18)',
  accentA35: 'rgba(145,132,217,0.35)',
  textA07: 'rgba(233,233,237,0.07)',
  textA14: 'rgba(233,233,237,0.14)',
  textA70: 'rgba(233,233,237,0.70)',

  // Ombres (seule exception au « pas de noir pur »)
  shadow: '#000',
  transparent: 'transparent',
} as const;

export type ColorToken = keyof typeof colors;

// §4 Espacements
export const spacing = {
  screenX: 16,
  gridGap: 8,
  carouselGap: 10,
  titleSectionGap: 24,
  discoverSectionGap: 20,
  discoverGenreGap: 28,
  nextEpisodeGap: 8,
  upcomingGap: 6,
  // Échelle Nocturne (.btn, .dialog, .card)
  s1: 2.8,
  s2: 5.6,
  s3: 8.4,
  s4: 11.2,
  s6: 16.8,
  s8: 22.4,
} as const;

// §5 Rayons
export const radii = {
  rXs: 4,
  rSm: 6,
  rMd: 8,
  rLg: 12,
  rXl: 14,
  rPill: 999,
} as const;

// §6 Ombres (élévation)
export const shadows = {
  shadowSm: {
    borderWidth: 1,
    borderColor: colors.neutral800,
  },
  shadowMd: {
    borderWidth: 1,
    borderColor: colors.neutral700,
    shadowColor: colors.shadow,
    shadowOpacity: 0.55,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  shadowLg: {
    borderWidth: 1,
    borderColor: colors.neutral500,
    shadowColor: colors.shadow,
    shadowOpacity: 0.65,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
  },
} as const;

// §7 Animations (durées en ms ; courbe : Easing.bezier(0.25, 0.1, 0.25, 1))
export const easeBezier = [0.25, 0.1, 0.25, 1] as const;

export const durations = {
  push: 220,
  fadeSearch: 180,
  fadeScrim: 200,
  fadeOnboarding: 300,
  sheetAction: 220,
  sheetEpisode: 250,
  sheetPlatforms: 250,
  sheetAdvancedSearch: 280,
  sheetClose: 200,
  up: 250,
  cardIn: 400,
  popEpisode: 350,
  popPoster: 300,
  shimmer: 1200,
  drift1: 70_000,
  drift2: 90_000,
  drift3: 110_000,
  press: 150,
  swipeReturn: 250,
  progress: 300,
  switch: 200,
  posterFadeIn: 150,
  toast: 5000,
  longPress: 480,
} as const;

export const motion = {
  pushTranslateX: 40,
  upTranslateY: 12,
  cardInTranslateY: 8,
  popScale: 1.25,
  shimmerWidth: 600,
  shimmerFrom: -300,
  shimmerTo: 300,
  pressScalePoster: 0.97,
  pressScaleGenre: 0.98,
  pressScaleUpcoming: 0.99,
} as const;

// §9 États communs
export const opacity = {
  disabled: 0.45,
} as const;

export const focusRing = {
  width: 2,
  offset: 2,
  color: colors.accent,
} as const;

// Zone tactile minimale (CLAUDE.md, règle 6)
export const minTouchTarget = 44;
