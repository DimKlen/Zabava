import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { easeTiming } from '@/lib/animation';
import { colors, durations, radii, shadows } from '@/theme/tokens';

/** Fermeture par glissement : plus de 80 pt, ou vitesse > 800 pt/s. */
const DRAG_CLOSE_DISTANCE = 80;
const DRAG_CLOSE_VELOCITY = 800;
/** Position de départ avant la première mesure : le panneau reste hors écran. */
const OFFSCREEN = 2000;
/** Au-dessus du panneau (shadowLg). */
export const OVERLAY_ELEVATION = shadows.shadowLg.elevation + 1;

type Props = {
  visible: boolean;
  onClose: () => void;
  /** 220 (action), 250 (épisode, plateformes), 280 (recherche avancée). */
  enterDuration: number;
  panelStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** Au-dessus du panneau, dans la même fenêtre (toast de la fiche épisode). */
  overlay?: ReactNode;
  /** false : pas de fermeture par glissement (contenu qui défile, fermeture par « OK »). */
  dragToClose?: boolean;
};

/**
 * Bottom sheet maison (Modal transparent + Reanimated) : le visuel doit être exact.
 * Scrim en fondu 200 ms, panneau qui monte, sortie en 200 ms.
 */
export function BottomSheet({
  visible,
  onClose,
  enterDuration,
  panelStyle,
  children,
  overlay,
  dragToClose = true,
}: Props) {
  // Reste monté pendant l'animation de sortie.
  const [mounted, setMounted] = useState(visible);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) setMounted(true);
  }

  const [height, setHeight] = useState(0);
  const scrim = useSharedValue(0);
  const translateY = useSharedValue(OFFSCREEN);

  // Entrée : une fois le panneau mesuré.
  useEffect(() => {
    if (!visible || height === 0) return;
    translateY.set(height);
    translateY.set(withTiming(0, easeTiming(enterDuration)));
    scrim.set(withTiming(1, easeTiming(durations.fadeScrim)));
  }, [visible, height, enterDuration, scrim, translateY]);

  // Sortie, puis démontage.
  useEffect(() => {
    if (visible || !mounted) return;
    const finish = () => {
      setMounted(false);
      setHeight(0);
    };
    scrim.set(withTiming(0, easeTiming(durations.sheetClose)));
    translateY.set(
      withTiming(height || OFFSCREEN, easeTiming(durations.sheetClose), (done) => {
        if (done) scheduleOnRN(finish);
      }),
    );
  }, [visible, mounted, height, scrim, translateY]);

  const drag = Gesture.Pan()
    .enabled(dragToClose)
    .activeOffsetY(10)
    .failOffsetX([-20, 20])
    .onUpdate((e) => {
      translateY.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > DRAG_CLOSE_DISTANCE || e.velocityY > DRAG_CLOSE_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        translateY.set(withTiming(0, easeTiming(durations.sheetClose)));
      }
    });

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.root}>
        <Scrim progress={scrim} onPress={onClose} />
        <GestureDetector gesture={drag}>
          <SheetPanel translateY={translateY} onHeight={setHeight} style={panelStyle}>
            {children}
          </SheetPanel>
        </GestureDetector>
        {overlay ? (
          <View pointerEvents="box-none" style={styles.overlay} testID="sheet-overlay">
            {overlay}
          </View>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

function Scrim({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const style = useAnimatedStyle(() => ({ opacity: progress.get() }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer"
        onPress={onPress}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function SheetPanel({
  translateY,
  onHeight,
  style,
  children,
}: {
  translateY: SharedValue<number>;
  onHeight: (height: number) => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  return (
    <Animated.View
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
      style={[styles.panel, style, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

/** Poignée 36 × 4 des action sheets. */
export function SheetHandle() {
  return <View style={styles.handle} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: colors.scrim,
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.rXl,
    borderTopRightRadius: radii.rXl,
    ...shadows.shadowLg,
    borderBottomWidth: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Sur Android, l'élévation passe avant l'ordre de rendu (dessin et toucher) :
    // sans elle, le panneau (shadowLg) recouvrirait le toast et capterait « Annuler ».
    zIndex: 1,
    elevation: OVERLAY_ELEVATION,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 4,
    marginBottom: 10,
    backgroundColor: colors.neutral700,
  },
});
