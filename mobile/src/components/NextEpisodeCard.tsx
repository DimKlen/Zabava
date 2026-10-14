import { Image } from 'expo-image';
import { CheckIcon, PauseCircleIcon, TrashIcon } from 'phosphor-react-native';
import { useEffect, useRef } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { easeTiming } from '@/lib/animation';
import { hapticLight } from '@/lib/haptics';
import { tmdbImage } from '@/lib/tmdb';
import { useUiStore } from '@/store/ui';
import { colors, durations, motion, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { GradientFill } from './GradientFill';
import { Text } from './Text';

// Seuils du swipe — specs/docs/03 › NextEpisodeCard.
export const SWIPE_OPEN = -150;
export const SWIPE_MIN = -170;
export const SWIPE_THRESHOLD = -60;

/** Translation pendant le geste, bornée à [−170, 0], depuis 0 ou −150 si déjà ouverte. */
export function clampSwipe(start: number, translation: number): number {
  'worklet';
  return Math.min(0, Math.max(SWIPE_MIN, start + translation));
}

/** Position au relâcher : ouverte à −150 au-delà de −60, sinon fermée. */
export function settleSwipe(position: number): number {
  'worklet';
  return position < SWIPE_THRESHOLD ? SWIPE_OPEN : 0;
}

type Props = {
  /** Identifiant unique de la carte (titleId) : une seule carte ouverte à la fois. */
  id: string;
  seriesName: string;
  /** « S04 E03 · Titre » (titre = « Épisode n » si anti-spoiler). */
  episodeLabel: string;
  /** « 3 épisodes restants » / « Dernier épisode disponible ». */
  remainingLabel: string;
  /** Progression 0–100. */
  progress: number;
  stillPath?: string;
  /** Clé du dégradé de remplacement : `id + s + '-' + e`. */
  stillKey: string;
  spoilerBlur?: boolean;
  /** Change à chaque coche : rejoue l'animation cardIn du texte. */
  animationKey?: string;
  onPress: () => void;
  onCheck: () => void;
  onAbandon: () => void;
  onRemove: () => void;
};

/** Carte « prochain épisode » avec coche et actions cachées (swipe). */
export function NextEpisodeCard({
  id,
  seriesName,
  episodeLabel,
  remainingLabel,
  progress,
  stillPath,
  stillKey,
  spoilerBlur = false,
  animationKey,
  onPress,
  onCheck,
  onAbandon,
  onRemove,
}: Props) {
  const isOpen = useUiStore((s) => s.swipedCardId === id);
  const setSwipedCard = useUiStore((s) => s.setSwipedCard);

  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  // Une autre carte s'ouvre, ou l'onglet change : celle-ci se referme.
  useEffect(() => {
    if (!isOpen) translateX.set(withTiming(0, easeTiming(durations.swipeReturn)));
  }, [isOpen, translateX]);

  // Retour Android : referme la carte avant de quitter l'écran (docs/04 §3).
  useEffect(() => {
    if (!isOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSwipedCard(null);
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, setSwipedCard]);

  const open = () => setSwipedCard(id);
  const close = () => {
    if (useUiStore.getState().swipedCardId === id) setSwipedCard(null);
  };
  const handleTap = () => {
    if (useUiStore.getState().swipedCardId === id) close();
    else onPress();
  };
  const handleCheck = () => {
    hapticLight();
    onCheck();
  };

  const checkTap = Gesture.Tap().onEnd((_e, success) => {
    if (success) scheduleOnRN(handleCheck);
  });

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startX.set(translateX.get());
    })
    .onUpdate((e) => {
      translateX.set(clampSwipe(startX.get(), e.translationX));
    })
    .onEnd(() => {
      const target = settleSwipe(translateX.get());
      translateX.set(withTiming(target, easeTiming(durations.swipeReturn)));
      scheduleOnRN(target === SWIPE_OPEN ? open : close);
    });

  // Un glissement ne déclenche jamais le tap ; la coche passe avant la carte.
  const cardTap = Gesture.Tap()
    .requireExternalGestureToFail(checkTap)
    .onEnd((_e, success) => {
      if (success) scheduleOnRN(handleTap);
    });

  const faceStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.get() }] }));

  const runAction = (action: () => void) => {
    setSwipedCard(null);
    action();
  };

  const uri = tmdbImage(stillPath, 'w300');

  return (
    <View style={styles.card}>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => runAction(onAbandon)}
          style={[styles.action, styles.abandon]}
        >
          <PauseCircleIcon size={20} color={colors.text} />
          <Text style={styles.actionLabel}>Abandonner</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => runAction(onRemove)}
          style={[styles.action, styles.remove]}
        >
          <TrashIcon size={20} color={colors.text} />
          <Text style={styles.actionLabel}>Retirer</Text>
        </Pressable>
      </View>

      <GestureDetector gesture={Gesture.Exclusive(pan, cardTap)}>
        <Animated.View
          accessible
          accessibilityRole="button"
          accessibilityLabel={`${seriesName}, ${episodeLabel}`}
          accessibilityActions={[
            { name: 'activate' },
            { name: 'check', label: 'Marquer comme vu' },
            { name: 'abandon', label: 'Abandonner' },
            { name: 'remove', label: 'Retirer' },
          ]}
          onAccessibilityAction={(e) => {
            if (e.nativeEvent.actionName === 'activate') onPress();
            if (e.nativeEvent.actionName === 'check') handleCheck();
            if (e.nativeEvent.actionName === 'abandon') onAbandon();
            if (e.nativeEvent.actionName === 'remove') onRemove();
          }}
          style={[styles.face, faceStyle]}
          testID="next-episode-card"
        >
          <View style={styles.thumb}>
            <View style={styles.thumbInner}>
              <GradientFill gradientKey={stillKey} />
              {uri ? (
                <Image
                  source={{ uri }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  blurRadius={spoilerBlur ? 6 : 0}
                  style={StyleSheet.absoluteFill}
                />
              ) : null}
            </View>
          </View>

          <CardText
            seriesName={seriesName}
            episodeLabel={episodeLabel}
            remainingLabel={remainingLabel}
            animationKey={animationKey}
          />

          <GestureDetector gesture={checkTap}>
            <View style={styles.checkZone} testID="next-episode-check">
              <View style={styles.checkVisual}>
                <CheckIcon size={16} color={colors.neutral500} />
              </View>
            </View>
          </GestureDetector>

          <ProgressBar progress={progress} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function CardText({
  seriesName,
  episodeLabel,
  remainingLabel,
  animationKey,
}: Pick<Props, 'seriesName' | 'episodeLabel' | 'remainingLabel' | 'animationKey'>) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const firstKey = useRef(animationKey);

  // cardIn (400 ms) rejouée à chaque coche, pas au premier affichage.
  useEffect(() => {
    if (animationKey === firstKey.current) return;
    opacity.set(0);
    translateY.set(motion.cardInTranslateY);
    opacity.set(withTiming(1, easeTiming(durations.cardIn)));
    translateY.set(withTiming(0, easeTiming(durations.cardIn)));
  }, [animationKey, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() }],
  }));

  return (
    <Animated.View style={[styles.text, style]}>
      <Text numberOfLines={1} style={styles.name}>
        {seriesName}
      </Text>
      <Text numberOfLines={1} style={styles.code}>
        {episodeLabel}
      </Text>
      <Text style={styles.remaining}>{remainingLabel}</Text>
    </Animated.View>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const width = useSharedValue(progress);
  useEffect(() => {
    width.set(withTiming(progress, easeTiming(durations.progress)));
  }, [progress, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  return <Animated.View pointerEvents="none" style={[styles.progress, style]} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.rLg,
    overflow: 'hidden',
    backgroundColor: colors.neutral900,
  },
  actions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: -SWIPE_OPEN,
    flexDirection: 'row',
  },
  action: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  abandon: {
    backgroundColor: colors.neutral800,
  },
  remove: {
    backgroundColor: colors.neutral700,
  },
  actionLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.text,
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 10,
    paddingRight: 4,
    paddingBottom: 12,
    paddingLeft: 10,
    backgroundColor: colors.surface,
  },
  thumb: {
    width: 96,
    height: 58,
    borderRadius: radii.rSm,
    overflow: 'hidden',
  },
  thumbInner: {
    flex: 1,
    // Agrandie pour que le flou anti-spoiler ne laisse pas de bord.
    transform: [{ scale: 1.15 }],
  },
  text: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 15 * 1.3,
    color: colors.text,
  },
  code: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 13 * 1.4,
    color: colors.neutral300,
  },
  remaining: {
    marginTop: 2,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.neutral500,
  },
  checkZone: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkVisual: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.neutral600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 2,
    backgroundColor: colors.accent,
  },
});
