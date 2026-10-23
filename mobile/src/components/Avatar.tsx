import { Image } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Text } from './Text';

export type AvatarSize = 24 | 32 | 40 | 44 | 48 | 56 | 88;

/** Taille de l'initiale ≈ 36 % du diamètre (specs/social/docs/03 › Avatar). */
const INITIAL_SIZE: Record<AvatarSize, number> = {
  24: 11,
  32: 12,
  40: 15,
  44: 16,
  48: 17,
  56: 20,
  88: 32,
};

type Props = {
  size: AvatarSize;
  /** Nom affiché : initiale et libellé d'accessibilité. */
  name: string;
  uri?: string | null;
  /** Mon avatar sans photo : fond accent foncé, comme l'avatar du Profil. */
  mine?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Avatar rond : photo en `cover`, sinon initiale du nom. */
export function Avatar({ size, name, uri, mine = false, style }: Props) {
  const initial = name.trim().charAt(0).toUpperCase();
  const fontSize = INITIAL_SIZE[size];
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={name}
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        { backgroundColor: mine ? colors.accent800 : colors.neutral800 },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <Text
          style={[
            styles.initial,
            { fontSize, lineHeight: fontSize * 1.2, color: mine ? colors.accent100 : colors.text },
          ]}
        >
          {initial}
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
  initial: {
    fontFamily: fonts.medium,
  },
});
