import type { Icon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

/** Groupe de réglages : titre h6 puis lignes séparées d'un trait de 1 pt. */
export function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Text accessibilityRole="header" style={[typography.overline, styles.groupLabel]}>
        {label}
      </Text>
      <View style={styles.group}>{children}</View>
    </View>
  );
}

type RowProps = {
  label: string;
  icon?: Icon;
  /** Valeur ou contrôle à droite. */
  children?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Ligne de réglage : hauteur min 50, icône 20, libellé, valeur à droite. */
export function SettingsRow({
  label,
  icon: IconComponent,
  children,
  onPress,
  accessibilityLabel,
}: RowProps) {
  const content = (
    <>
      {IconComponent ? <IconComponent size={20} color={colors.neutral400} /> : null}
      <Text numberOfLines={1} style={styles.label}>
        {label}
      </Text>
      {children}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupLabel: {
    marginBottom: 8,
  },
  group: {
    gap: 1,
    borderRadius: radii.rLg,
    overflow: 'hidden',
    backgroundColor: colors.neutral900,
  },
  row: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.neutral800,
  },
  label: {
    // Le libellé garde sa largeur ; c'est la valeur à droite qui rétrécit.
    flexGrow: 1,
    flexShrink: 0,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 15 * 1.55,
    color: colors.text,
  },
});
