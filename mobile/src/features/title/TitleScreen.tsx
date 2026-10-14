import { CaretLeftIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTitle, type TitleDetail } from '@/api/titles';
import { GradientFill } from '@/components/GradientFill';
import { LoadError } from '@/components/LoadError';
import { RoundIconButton } from '@/components/RoundIconButton';
import type { MediaType } from '@/domain/types';
import { goBack } from '@/lib/navigation';
import { colors } from '@/theme/tokens';

import { MovieScreen } from './MovieScreen';
import { SeriesScreen } from './SeriesScreen';

type Props = { type: MediaType; tmdbId: number; season?: number; episode?: number };

const isSeries = (detail: TitleDetail): detail is TitleDetail & { type: 'tv' | 'anime' } =>
  detail.type !== 'movie';

/** Fiche titre : film, série ou animé. */
export function TitleScreen({ type, tmdbId, season, episode }: Props) {
  const title = useTitle(type, tmdbId);
  const detail = title.data;
  if (detail) {
    return isSeries(detail) ? (
      <SeriesScreen series={detail} initialSeason={season} initialEpisode={episode} />
    ) : (
      <MovieScreen movie={detail} />
    );
  }
  return (
    <TitleLoading
      gradientKey={`${type}-${tmdbId}`}
      error={title.isError}
      onRetry={() => void title.refetch()}
    />
  );
}

type LoadingProps = { gradientKey: string; error: boolean; onRetry: () => void };

/** Chargement ou erreur : backdrop de remplacement et bouton retour. */
function TitleLoading({ gradientKey, error, onRetry }: LoadingProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <View style={styles.backdrop}>
        <GradientFill gradientKey={gradientKey} />
        <View style={[styles.back, { top: insets.top + 3 }]}>
          <RoundIconButton icon={CaretLeftIcon} accessibilityLabel="Retour" onPress={goBack} />
        </View>
      </View>
      {error ? <LoadError onRetry={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  backdrop: {
    height: 250,
  },
  back: {
    position: 'absolute',
    left: 12,
  },
});
