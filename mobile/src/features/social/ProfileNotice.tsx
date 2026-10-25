import { LockSimpleIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

/** À la place des listes d'un membre qui n'est pas encore un ami (docs/03 › LockedState). */
export function ProfileNotice({ username }: { username: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.circle}>
        <LockSimpleIcon size={26} color={colors.text} />
      </View>
      <Text style={styles.title}>Réservé à ses amis</Text>
      <Text style={styles.text}>{`Ajoute @${username} en ami pour voir ses listes`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderRadius: radii.rLg,
    backgroundColor: colors.surface,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral800,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 17,
    lineHeight: 17 * 1.3,
    color: colors.text,
    textAlign: 'center',
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral400,
    textAlign: 'center',
  },
});
