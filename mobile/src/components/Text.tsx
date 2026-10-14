import { Text as NativeText, type TextProps } from 'react-native';

/** Taille de police dynamique : suivie jusqu'à ×1,3, sans casser les mises en page. */
export const MAX_FONT_SCALE = 1.3;

/** `Text` de React Native, plafonné à `MAX_FONT_SCALE` (specs/etapes/09 §3). */
export function Text({ maxFontSizeMultiplier = MAX_FONT_SCALE, ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}
