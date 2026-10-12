import type { Icon } from 'phosphor-react-native';
import { CaretDownIcon, CheckIcon } from 'phosphor-react-native';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { openActionSheet } from '@/store/ui';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

export type SelectOption<V extends string> = { value: V; label: string };

type Props<V extends string> = {
  label: string;
  value: V;
  options: readonly SelectOption<V>[];
  onChange: (value: V) => void;
  /** 48 (onboarding) ou 42 (recherche avancée). */
  height?: 42 | 48;
  /** Titre de l'ActionSheet (par défaut : le libellé du champ). */
  sheetTitle?: string;
  /** Icône des options non choisies (Circle pour les tris) ; aucune par défaut. */
  inactiveIcon?: Icon;
  style?: StyleProp<ViewStyle>;
};

/** Champ `.field` + sélecteur `.input` qui ouvre une ActionSheet. Pas de Picker natif. */
export function SelectField<V extends string>({
  label,
  value,
  options,
  onChange,
  height = 48,
  sheetTitle,
  inactiveIcon,
  style,
}: Props<V>) {
  const current = options.find((option) => option.value === value);

  const open = () =>
    openActionSheet({
      title: sheetTitle ?? label,
      options: options.map((option) => ({
        label: option.label,
        icon: option.value === value ? CheckIcon : inactiveIcon,
        onPress: () => onChange(option.value),
      })),
    });

  return (
    <View style={style}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${current?.label ?? ''}`}
        onPress={open}
        hitSlop={height < 44 ? (44 - height) / 2 : undefined}
        style={[styles.input, { height }]}
      >
        <Text numberOfLines={1} style={styles.value}>
          {current?.label}
        </Text>
        <CaretDownIcon size={16} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 5,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.textA70,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radii.rMd,
    backgroundColor: colors.surface,
  },
  value: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.text,
  },
});
