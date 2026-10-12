import { useNetInfo } from '@react-native-community/netinfo';
import { CloudSlashIcon } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

/** Bandeau hors ligne, affiché dans les onglets quand `isConnected === false`. */
export function OfflineBanner() {
  const { isConnected } = useNetInfo();
  if (isConnected !== false) return null;
  return <OfflineBannerView />;
}

/** Visuel seul (aussi utilisé par le kitchen-sink). */
export function OfflineBannerView() {
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <CloudSlashIcon size={14} color={colors.neutral300} />
      <Text style={styles.text}>Hors ligne · affichage depuis le cache</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.neutral900,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral300,
  },
});
