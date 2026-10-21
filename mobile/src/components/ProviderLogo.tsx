import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { countryLabel } from '@/domain/availability';
import type { Provider } from '@/domain/types';
import { tmdbImage } from '@/lib/tmdb';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Text } from './Text';

type Props = {
  provider: Provider;
  /** Une de mes plateformes : anneau accent, sinon neutral700. */
  mine: boolean;
  /** Ma région : son pays n'est pas affiché, sinon le pays le plus proche. */
  region?: string;
  onPress: () => void;
};

const SIZE = 40;

/**
 * Pastille de plateforme des fiches (« Où regarder »).
 * L'appelant ouvre le lien et affiche le toast « Ouverture de {plateforme}… ».
 */
export function ProviderLogo({ provider, mine, region, onPress }: Props) {
  const uri = tmdbImage(provider.logoPath, 'w92');
  // « Netflix (USA) » : le catalogue d'une plateforme change selon le pays.
  const country = countryLabel(provider.countries, region);
  const label = country ? `${provider.name} ${country}` : provider.name;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.button}
    >
      <View style={[styles.dot, { borderColor: mine ? colors.accent : colors.neutral700 }]}>
        {uri ? (
          <Image source={{ uri }} contentFit="cover" style={styles.logo} />
        ) : (
          <Text style={styles.short}>{provider.short}</Text>
        )}
      </View>
      <Text style={styles.name}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 64,
    minHeight: 44,
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral800,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  short: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.text,
  },
  name: {
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 11 * 1.3,
    color: colors.neutral400,
    textAlign: 'center',
  },
});
