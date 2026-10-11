import type { Icon } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Button } from './Button';

type Props = {
  icon: Icon;
  title: string;
  text?: string;
  action?: { label: string; onPress: () => void };
  /** 64 par défaut, 48 dans À venir. */
  paddingTop?: 48 | 64;
};

/** État vide : icône, phrase, bouton d'action. Colonne alignée à gauche. */
export function EmptyState({ icon: IconComponent, title, text, action, paddingTop = 64 }: Props) {
  return (
    <View style={[styles.container, { paddingVertical: paddingTop }]}>
      <IconComponent size={40} color={colors.neutral600} />
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {action ? (
        <Button
          variant="primary"
          height={44}
          label={action.label}
          onPress={action.onPress}
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.55,
    color: colors.text,
  },
  text: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: colors.neutral400,
  },
  button: {
    marginTop: 8,
  },
});
