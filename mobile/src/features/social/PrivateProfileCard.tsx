import { StyleSheet, View } from 'react-native';

import { Switch } from '@/components/Switch';
import { Text } from '@/components/Text';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  value: boolean;
  onChange: (value: boolean) => void;
};

/** Carte « Profil privé » de l'onboarding et de Modifier le profil (specs/social/docs/04 §4.1). */
export function PrivateProfileCard({ value, onChange }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <Text style={styles.label}>Profil privé</Text>
        <Text style={styles.help}>
          Seules les personnes que tu acceptes verront tes listes et ton activité.
        </Text>
      </View>
      <Switch value={value} onValueChange={onChange} accessibilityLabel="Profil privé" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radii.rLg,
    backgroundColor: colors.surface,
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 15 * 1.4,
    color: colors.text,
  },
  help: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
});
