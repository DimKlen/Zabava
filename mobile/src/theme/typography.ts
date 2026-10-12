/**
 * Typographie Inter — specs/docs/02-design-tokens.md §3.
 * React Native attend un interligne absolu : lineHeight = taille × interligne.
 */
import type { TextStyle } from 'react-native';

import { colors } from './tokens';

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

type Weight = 400 | 500 | 600 | 700;

const familyFor: Record<Weight, string> = {
  400: fonts.regular,
  500: fonts.medium,
  600: fonts.semiBold,
  700: fonts.bold,
};

function style(
  size: number,
  weight: Weight,
  lineHeight: number,
  letterSpacing?: number,
): TextStyle {
  return {
    fontFamily: familyFor[weight],
    fontSize: size,
    lineHeight: Math.round(size * lineHeight * 100) / 100,
    ...(letterSpacing === undefined ? {} : { letterSpacing }),
  };
}

export const typography = {
  display: style(34, 500, 1.1, -0.51),
  h1Notif: style(30, 500, 1.12, -0.45),
  screenTitle: style(28, 500, 1.12, -0.42),
  titleXL: style(24, 500, 1.12, -0.36),
  sheetTitle: style(22, 500, 1.12, -0.33),
  dialogTitle: style(20, 500, 1.2),
  section: style(18, 500, 1.12, -0.27),
  name: style(17, 500, 1.3),
  bodyStrong: style(15, 500, 1.3),
  body: style(15, 400, 1.55),
  label: style(14, 400, 1.4),
  labelMedium: style(14, 500, 1.4),
  meta: style(13, 400, 1.4),
  small: style(12, 400, 1.3),
  smallMedium: style(12, 500, 1.3),
  tiny: style(11, 400, 1.3),
  micro: style(10, 500, 1.2),
  overline: {
    ...style(13, 500, 1.12, 1.04),
    textTransform: 'uppercase',
    color: colors.neutral500,
  },
  // Titre posé sur une affiche de remplacement
  posterTitle: style(12, 500, 1.2),
} as const satisfies Record<string, TextStyle>;

/** Corps par défaut : 15 pt, interligne 1.55, graisse 400, couleur text. */
export const defaultText: TextStyle = {
  ...typography.body,
  color: colors.text,
};
