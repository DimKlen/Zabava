import { CaretDownIcon, CaretUpIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Text } from './Text';

type Props = {
  title: string;
  open: boolean;
  onToggle: () => void;
};

/** En-tête de section repliable (Ma liste › Séries/Animés), sans compteur. */
export function SectionHeader({ title, open, onToggle }: Props) {
  const Caret = open ? CaretUpIcon : CaretDownIcon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={title}
      onPress={onToggle}
      style={styles.header}
    >
      <Text style={styles.title}>{title}</Text>
      <Caret size={16} color={colors.neutral500} style={styles.caret} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.screenX,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  caret: {
    marginLeft: 'auto',
  },
});
