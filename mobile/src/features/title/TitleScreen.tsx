import { router } from 'expo-router';
import { CaretLeftIcon } from 'phosphor-react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTitle } from '@/api/titles';
import { GradientFill } from '@/components/GradientFill';
import { LoadError } from '@/components/LoadError';
import { RoundIconButton } from '@/components/RoundIconButton';
import type { MediaType } from '@/domain/types';
import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen';
import { colors } from '@/theme/tokens';

import { MovieScreen } from './MovieScreen';

type Props = { type: MediaType; tmdbId: number };

/** Fiche titre : les séries et animés arrivent à l'étape 6. */
export function TitleScreen({ type, tmdbId }: Props) {
  if (type !== 'movie') return <PlaceholderScreen name={`title/${type}/${tmdbId}`} />;
  return <MovieLoader tmdbId={tmdbId} />;
}

function MovieLoader({ tmdbId }: { tmdbId: number }) {
  const title = useTitle('movie', tmdbId);
  if (title.data) return <MovieScreen movie={title.data} />;
  return (
    <TitleLoading
      gradientKey={`movie-${tmdbId}`}
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
          <RoundIconButton
            icon={CaretLeftIcon}
            accessibilityLabel="Retour"
            onPress={() => router.back()}
          />
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
