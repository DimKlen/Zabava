import { Pressable, StyleSheet, Text } from 'react-native';

import { useUiStore } from '@/store/ui';
import { colors, durations, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { BottomSheet, SheetHandle } from './BottomSheet';
import { Button } from './Button';

/**
 * Hôte global de l'ActionSheet, monté une fois dans app/_layout.tsx.
 * Choisir une option ferme la sheet, puis exécute l'action (sans attendre la fin
 * de l'animation de sortie, qui peut être interrompue).
 */
export function ActionSheetHost() {
  const sheet = useUiStore((s) => s.actionSheet);
  const open = useUiStore((s) => s.actionSheetOpen);
  const close = useUiStore((s) => s.closeActionSheet);

  return (
    <BottomSheet
      visible={open}
      onClose={close}
      enterDuration={durations.sheetAction}
      panelStyle={styles.panel}
    >
      <SheetHandle />
      {sheet?.title ? <Text style={styles.title}>{sheet.title}</Text> : null}
      {sheet?.options.map((option) => {
        const IconComponent = option.icon;
        return (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            onPress={() => {
              close();
              option.onPress();
            }}
            style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
          >
            {IconComponent ? <IconComponent size={20} color={colors.neutral400} /> : null}
            <Text style={styles.optionLabel}>{option.label}</Text>
          </Pressable>
        );
      })}
      <Button
        variant="secondary"
        height={46}
        label="Annuler"
        onPress={close}
        style={styles.cancel}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 34,
  },
  title: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral400,
  },
  option: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    borderRadius: radii.rMd,
  },
  optionPressed: {
    backgroundColor: colors.neutral800,
  },
  optionLabel: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  cancel: {
    width: '100%',
    marginTop: 8,
  },
});
