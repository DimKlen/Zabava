import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { BellRingingIcon, BellSlashIcon, CaretLeftIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientFill } from '@/components/GradientFill';
import { Poster } from '@/components/Poster';
import { RoundIconButton } from '@/components/RoundIconButton';
import { tmdbImage } from '@/lib/tmdb';
import { colors, durations } from '@/theme/tokens';
import { typography } from '@/theme/typography';

type Props = {
  id: string;
  title: string;
  posterPath?: string;
  backdropPath?: string;
  meta: string;
  genres: string[];
  alertsOn: boolean;
  onToggleAlerts: () => void;
  /** Boutons de droite en plus de la cloche (DotsThree des séries). */
  extraActions?: ReactNode;
};

const BACKDROP_HEIGHT = 250;

/** En-tête d'une fiche : backdrop, retour, cloche, affiche et bloc titre (docs/07 §7.1). */
export function TitleHeader({
  id,
  title,
  posterPath,
  backdropPath,
  meta,
  genres,
  alertsOn,
  onToggleAlerts,
  extraActions,
}: Props) {
  const insets = useSafeAreaInsets();
  const backdrop = tmdbImage(backdropPath, 'w780');

  return (
    <View>
      <View style={styles.backdrop}>
        <GradientFill gradientKey={id} />
        {backdrop ? (
          <Image
            source={{ uri: backdrop }}
            contentFit="cover"
            transition={durations.posterFadeIn}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        <LinearGradient colors={[colors.bgA25, colors.bg]} style={StyleSheet.absoluteFill} />
        <View style={[styles.buttons, { top: insets.top + 3 }]}>
          <RoundIconButton
            icon={CaretLeftIcon}
            accessibilityLabel="Retour"
            onPress={() => router.back()}
          />
          <View style={styles.right}>
            <RoundIconButton
              icon={alertsOn ? BellRingingIcon : BellSlashIcon}
              accessibilityLabel={alertsOn ? 'Couper les alertes' : 'Activer les alertes'}
              onPress={onToggleAlerts}
            />
            {extraActions}
          </View>
        </View>
      </View>
      <View style={styles.titleBlock}>
        <Poster title={{ id, title, posterPath }} style={styles.poster} />
        <View style={styles.titleText}>
          <Text accessibilityRole="header" textBreakStrategy="balanced" style={styles.title}>
            {title}
          </Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
          {genres.length > 0 ? <Text style={styles.genres}>{genres.join(', ')}</Text> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    height: BACKDROP_HEIGHT,
  },
  buttons: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  right: {
    flexDirection: 'row',
    gap: 8,
  },
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    paddingHorizontal: 16,
    marginTop: -120,
  },
  poster: {
    width: 104,
  },
  titleText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.titleXL,
    marginBottom: 6,
    color: colors.text,
  },
  meta: {
    ...typography.meta,
    color: colors.neutral300,
  },
  genres: {
    ...typography.meta,
    marginTop: 2,
    color: colors.neutral500,
  },
});
