import type { Icon } from 'phosphor-react-native';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

type Props = {
  icon: Icon;
  accessibilityLabel: string;
  onPress: () => void;
  /** 20 par défaut, 22 pour DotsThree. */
  iconSize?: 20 | 22;
};

/** Bouton rond 40 × 40 posé sur une image (retour, cloche, menu). */
export function RoundIconButton({
  icon: IconComponent,
  accessibilityLabel,
  onPress,
  iconSize = 20,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={2}
      style={styles.button}
    >
      <IconComponent size={iconSize} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgA60,
  },
});
