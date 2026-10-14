import { Image } from 'expo-image';
import { CheckIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import type { Provider } from '@/domain/types';
import { tmdbImage } from '@/lib/tmdb';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  provider: Provider;
  selected: boolean;
  width: number;
  onToggle: () => void;
  /** PlatformsSheet du Profil : pastille 36, textes plus petits, pas de coche. */
  compact?: boolean;
};

/** Tuile de plateforme (onboarding étape 2, Mes plateformes) : tap = bascule. */
export function PlatformTile({ provider, selected, width, onToggle, compact = false }: Props) {
  const uri = tmdbImage(provider.logoPath, 'w92');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={provider.name}
      accessibilityState={{ checked: selected }}
      onPress={onToggle}
      style={[
        styles.tile,
        compact && styles.compactTile,
        { width },
        selected ? styles.selected : styles.idle,
      ]}
    >
      <View style={[styles.logo, compact && styles.compactLogo]}>
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={styles.logoImage} />
        ) : (
          <Text style={[styles.short, compact && styles.compactShort]}>{provider.short}</Text>
        )}
      </View>
      <Text style={[styles.name, compact && styles.compactName]}>{provider.name}</Text>
      {selected && !compact ? (
        <View style={styles.check}>
          <CheckIcon size={12} color={colors.bg} weight="bold" />
        </View>
      ) : null}
    </Pressable>
  );
}

const LOGO = 44;
const COMPACT_LOGO = 36;

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 6,
    paddingBottom: 12,
    borderRadius: radii.rLg,
    borderWidth: 1,
  },
  compactTile: {
    gap: 6,
    paddingTop: 12,
    paddingHorizontal: 4,
    paddingBottom: 10,
  },
  compactLogo: {
    width: COMPACT_LOGO,
    height: COMPACT_LOGO,
    borderRadius: COMPACT_LOGO / 2,
  },
  compactShort: {
    fontSize: 12,
    lineHeight: 12 * 1.3,
  },
  compactName: {
    fontSize: 11,
    lineHeight: 11 * 1.3,
  },
  idle: {
    backgroundColor: colors.surface,
    borderColor: colors.transparent,
  },
  selected: {
    backgroundColor: colors.accent900,
    borderColor: colors.accent,
  },
  logo: {
    width: LOGO,
    height: LOGO,
    borderRadius: LOGO / 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral800,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  short: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    lineHeight: 13 * 1.3,
    color: colors.text,
  },
  name: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    textAlign: 'center',
    color: colors.text,
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
