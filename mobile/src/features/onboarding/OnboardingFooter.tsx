import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { colors } from '@/theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Ligne au-dessus du bouton (compteur de l'étape 3). */
  children?: ReactNode;
};

/** Pied d'étape : dégradé bg (70 %) → transparent vers le haut, bouton principal 50. */
export function OnboardingFooter({ label, onPress, disabled, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.transparent, colors.bg, colors.bg]}
      locations={[0, 0.3, 1]}
      style={[styles.footer, { paddingBottom: Math.max(34, insets.bottom) }]}
    >
      {children}
      <Button
        variant="primary"
        height={50}
        fontSize={15}
        label={label}
        disabled={disabled}
        onPress={onPress}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
});
