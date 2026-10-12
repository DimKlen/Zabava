import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { genreGradient, gradientFor } from '@/theme/gradients';

type Props = {
  /** Clé hachée (`title.id`, nom de personne, `id + s + '-' + e`)… */
  gradientKey?: string;
  /** …ou index de tuile de genre (dégradé `(index + 2) % 7`). */
  genreIndex?: number;
  style?: StyleProp<ViewStyle>;
};

/** Dégradé de remplacement Nocturne, qui remplit son parent. */
export function GradientFill({ gradientKey = '', genreIndex, style }: Props) {
  const gradient = genreIndex === undefined ? gradientFor(gradientKey) : genreGradient(genreIndex);
  return (
    <LinearGradient
      colors={gradient.colors}
      start={gradient.start}
      end={gradient.end}
      style={[StyleSheet.absoluteFill, style]}
    />
  );
}
