import { LockSimpleIcon, ProhibitIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = { kind: 'locked' | 'blocked'; username: string };

/** À la place des listes : pas encore amis, ou bloqué par moi (docs/03 › LockedState). */
export function ProfileNotice({ kind, username }: Props) {
  const Icon = kind === 'locked' ? LockSimpleIcon : ProhibitIcon;
  return (
    <View style={styles.card}>
      <View style={styles.circle}>
        <Icon size={26} color={colors.text} />
      </View>
      <Text style={styles.title}>
        {kind === 'locked' ? 'Réservé à ses amis' : 'Tu as bloqué ce profil'}
      </Text>
      <Text style={styles.text}>
        {kind === 'locked'
          ? `Ajoute @${username} en ami pour voir ses listes`
          : 'Débloque-le pour voir ses listes et redevenir amis.'}
      </Text>
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
