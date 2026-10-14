import { CaretDownIcon, CaretUpIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors, spacing } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { Text } from './Text';

type Props = {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
};

/** En-tête de section repliable (Ma liste › Séries/Animés). */
export function SectionHeader({ title, count, open, onToggle }: Props) {
  const Caret = open ? CaretUpIcon : CaretDownIcon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${title}, ${count}`}
      onPress={onToggle}
      style={styles.header}
    >
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.count}>{count}</Text>
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
  count: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral500,
  },
  caret: {
    marginLeft: 'auto',
  },
});
