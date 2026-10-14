import { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { easeTiming } from '@/lib/animation';
import { useUiStore, type DialogAction } from '@/store/ui';
import { colors, durations, radii, shadows, spacing } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { Button } from './Button';
import { Text } from './Text';

/**
 * Hôte global du dialogue, au-dessus de tout (y compris des sheets).
 * Tap sur une action : ferme, puis exécute. Le scrim ne ferme pas.
 */
export function DialogHost() {
  const dialog = useUiStore((s) => s.dialog);
  const open = useUiStore((s) => s.dialogOpen);
  const close = useUiStore((s) => s.closeDialog);
  const opacity = useSharedValue(0);

  // Reste monté pendant le fondu de sortie.
  const [mounted, setMounted] = useState(open);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setMounted(true);
  }

  useEffect(() => {
    if (open) {
      opacity.set(withTiming(1, easeTiming(durations.fadeScrim)));
      return;
    }
    if (!mounted) return;
    const finish = () => setMounted(false);
    opacity.set(
      withTiming(0, easeTiming(durations.fadeScrim), (done) => {
        if (done) scheduleOnRN(finish);
      }),
    );
  }, [open, mounted, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  const run = (action: DialogAction) => {
    close();
    action.onPress?.();
  };

  if (!mounted || !dialog) return null;

  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={close}>
      <Animated.View style={[styles.backdrop, fadeStyle]}>
        <View accessibilityRole="alert" style={styles.dialog}>
          <Text style={styles.title}>{dialog.title}</Text>
          {dialog.body ? <Text style={styles.body}>{dialog.body}</Text> : null}
          <View style={styles.actions}>
            {dialog.actions.map((action) => (
              <Button
                key={action.label}
                variant={action.variant}
                height={42}
                label={action.label}
                onPress={() => run(action)}
              />
            ))}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.s4,
    backgroundColor: colors.scrim,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    gap: spacing.s3,
    padding: spacing.s4,
    borderRadius: radii.rXl,
    backgroundColor: colors.surface,
    ...shadows.shadowLg,
  },
  title: {
    ...typography.dialogTitle,
    color: colors.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: colors.text,
    opacity: 0.85,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.s2,
    marginTop: spacing.s2,
  },
});
