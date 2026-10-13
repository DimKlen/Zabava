import { Image } from 'expo-image';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { GradientFill } from '@/components/GradientFill';
import { initials } from '@/domain/initials';
import { tmdbImage } from '@/lib/tmdb';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  name: string;
  profilePath?: string;
  /** 40 (ligne de recherche, initiales 13) ou 96 (fiche, initiales 30). */
  size: 40 | 96;
  style?: StyleProp<ViewStyle>;
};

/** Photo ronde d'une personne, ou dégradé `hash(nom)` et initiales. */
export function PersonAvatar({ name, profilePath, size, style }: Props) {
  const photo = tmdbImage(profilePath, 'w185');
  const fontSize = size === 96 ? 30 : 13;
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, style]}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <GradientFill gradientKey={name} />
      {photo ? (
        <Image
          source={{ uri: photo }}
          contentFit="cover"
          cachePolicy="memory-disk"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <Text style={[styles.initials, { fontSize, lineHeight: fontSize * 1.2 }]}>
          {initials(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: fonts.medium,
    color: colors.text,
  },
});
