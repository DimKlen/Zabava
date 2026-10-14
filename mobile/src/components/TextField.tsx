import type { Icon } from 'phosphor-react-native';
import { useState, type Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { MAX_FONT_SCALE } from './Text';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  /** 42 dans la recherche et la recherche avancée. */
  height: number;
  /** Icône à gauche (loupe de la recherche : 16, à 11 pt du bord). */
  icon?: Icon;
  style?: StyleProp<ViewStyle>;
  ref?: Ref<TextInput>;
};

/** Champ `.input` : fond surface, bord divider (accent au focus), texte 14, curseur accent. */
export function TextField({
  height,
  icon: IconComponent,
  style,
  onFocus,
  onBlur,
  ref,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.wrapper, { height }, style]}>
      <TextInput
        ref={ref}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        // Champs de recherche : pas de suggestions d'adresse ou de mot de passe du clavier.
        autoComplete="off"
        importantForAutofill="no"
        textContentType="none"
        {...rest}
        placeholderTextColor={colors.neutral500}
        selectionColor={colors.accentA35}
        cursorColor={colors.accent}
        style={[
          styles.input,
          { height },
          IconComponent ? styles.withIcon : null,
          focused ? styles.focused : null,
        ]}
      />
      {IconComponent ? (
        <View pointerEvents="none" style={styles.icon}>
          <IconComponent size={16} color={colors.neutral500} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'center',
  },
  input: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.rMd,
    backgroundColor: colors.surface,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
  },
  withIcon: {
    paddingLeft: 34,
  },
  focused: {
    borderColor: colors.accent,
  },
  icon: {
    position: 'absolute',
    left: 11,
  },
});
