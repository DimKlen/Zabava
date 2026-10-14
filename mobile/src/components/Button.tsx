import type { Icon } from 'phosphor-react-native';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { colors, opacity, radii, spacing } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'icon';

type Props = {
  variant: ButtonVariant;
  /** Hauteur explicite (specs/docs/03 › Button) : 32 à 50. */
  height: number;
  label?: string;
  icon?: Icon;
  iconSize?: number;
  /** Icône pleine (Eye fill…) ou en gras posée sur l'accent. */
  iconWeight?: 'regular' | 'fill' | 'bold';
  fontSize?: 13 | 14 | 15;
  /** Couleur imposée par le prototype (text, neutral400, accent300…). */
  color?: string;
  /** Variante icon : largeur (par défaut = hauteur) et contour secondaire. */
  width?: number;
  bordered?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const pressedBackground: Record<ButtonVariant, string> = {
  primary: colors.accentA22,
  secondary: colors.textA14,
  ghost: colors.accentA18,
  icon: colors.accentA18,
};

/** Bouton Nocturne (`.btn`). Les boutons principaux ne sont jamais remplis. */
export function Button({
  variant,
  height,
  label,
  icon: IconComponent,
  iconSize = 18,
  iconWeight = 'regular',
  fontSize = 14,
  color,
  width,
  bordered = false,
  disabled = false,
  onPress,
  accessibilityLabel,
  testID,
  style,
  textStyle,
}: Props) {
  const contentColor =
    color ?? (variant === 'primary' || variant === 'ghost' ? colors.accent : colors.text);
  const isIcon = variant === 'icon';
  const slop = height < 44 ? (44 - height) / 2 : undefined;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={slop}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        (variant === 'secondary' || (isIcon && bordered)) && styles.secondary,
        variant === 'ghost' && styles.ghost,
        isIcon && styles.icon,
        { height },
        isIcon && { width: width ?? height },
        pressed && { backgroundColor: pressedBackground[variant] },
        disabled && styles.disabled,
        style,
      ]}
    >
      {IconComponent ? (
        <IconComponent size={iconSize} color={contentColor} weight={iconWeight} />
      ) : null}
      {label ? (
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            { fontSize, lineHeight: fontSize * 1.2, color: contentColor },
            textStyle,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s3 * 1.2,
    borderRadius: radii.rMd,
    borderWidth: 1,
    borderColor: colors.transparent,
    backgroundColor: colors.transparent,
  },
  primary: {
    borderColor: colors.accent,
  },
  secondary: {
    borderColor: colors.divider,
  },
  ghost: {
    paddingHorizontal: spacing.s1,
  },
  icon: {
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  disabled: {
    opacity: opacity.disabled,
  },
  label: {
    fontFamily: fonts.medium,
  },
});
