import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { useProfile } from '@/api/profile';
import type { TitleDetail } from '@/api/titles';
import { useMovieWatchlist } from '@/api/watchlist';
import { RatingChips } from '@/components/RatingChips';
import { movieCrew, movieInfos, movieMeta, movieStatus } from '@/domain/movieDetail';
import { useAfterFirstFrame } from '@/lib/useAfterFirstFrame';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { CastCarousel } from './CastCarousel';
import { InfoRows, InfoSection } from './InfoSection';
import { MovieActions } from './MovieActions';
import type { TitlePreview } from './openTitle';
import { PosterCarousel } from './PosterCarousel';
import { StatusBanner } from './StatusBanner';
import { Synopsis } from './Synopsis';
import { TitleHeader } from './TitleHeader';
import { TitleBodySkeleton } from './TitleSkeleton';
import { toggleTitleAlerts } from './toggleTitleAlerts';
import { TrailerButton } from './TrailerButton';
import { WhereToWatch } from './WhereToWatch';

type Props = {
  /** Identifiant de la route (`movie-603`) : stable du tap jusqu'à la fiche complète. */
  id: string;
  /** Ce que la liste savait du titre, affiché pendant le chargement. */
  preview?: TitlePreview;
  /** Absente tant que la fiche n'est pas reçue : squelettes sous l'en-tête. */
  movie?: TitleDetail;
  /** Erreur de chargement (« Réessayer ») à la place des squelettes. */
  failure?: ReactNode;
};

/**
 * Fiche film (specs/docs/07 §7.1). Le même écran sert du tap à la fiche complète :
 * l'en-tête reste en place et seules les données qui arrivent remplacent leurs squelettes.
 */
export function MovieScreen({ id, preview, movie, failure }: Props) {
  const localAlertsOff = useUiStore((s) => s.alertsOff[id] ?? false);
  const alertsOn = movie?.userTitle ? movie.userTitle.notificationsEnabled : !localAlertsOff;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TitleHeader
        id={id}
        title={movie?.title ?? preview?.title ?? ''}
        posterPath={movie?.posterPath ?? preview?.posterPath}
        backdropPath={movie?.backdropPath}
        meta={movie ? movieMeta(movie) : ''}
        genres={movie?.genres ?? []}
        loading={!movie}
        alertsOn={alertsOn}
        onToggleAlerts={movie ? () => toggleTitleAlerts(movie, !alertsOn) : undefined}
      />
      {movie ? <MovieBody movie={movie} /> : (failure ?? <TitleBodySkeleton />)}
    </ScrollView>
  );
}

/** Sections sous l'en-tête, une fois la fiche reçue. */
function MovieBody({ movie }: { movie: TitleDetail }) {
  const profile = useProfile().data;
  const myProviderIds = profile?.providerIds ?? [];
  const libraryIds = new Set((useMovieWatchlist().data ?? []).map((film) => film.id));

  const belowFold = useAfterFirstFrame();
  const hasRating = movie.imdbRating !== undefined || movie.rtScore !== undefined;

  return (
    <>
      {hasRating ? (
        <RatingChips
          imdbRating={movie.imdbRating}
          imdbVotes={movie.imdbVotes}
          rtScore={movie.rtScore}
          style={styles.ratings}
        />
      ) : null}
      <MovieActions movie={movie} userTitle={movie.userTitle} />
      <StatusBanner status={movieStatus(movie, new Date())} />

      <WhereToWatch availability={movie.availability} myProviderIds={myProviderIds} />
      {movie.overview ? <Synopsis text={movie.overview} /> : null}
      {/* Sous la ligne de flottaison : montés à l'image suivante, sans figer l'écran. */}
      {belowFold && movie.trailerKey ? (
        <TrailerButton
          titleId={movie.id}
          trailerKey={movie.trailerKey}
          backdropPath={movie.backdropPath}
        />
      ) : null}
      {belowFold ? <MovieMore movie={movie} libraryIds={libraryIds} /> : null}
    </>
  );
}

function MovieMore({ movie, libraryIds }: { movie: TitleDetail; libraryIds: Set<string> }) {
  const crew = movieCrew(movie);
  const infos = movieInfos(movie);
  return (
    <>
      <CastCarousel cast={movie.cast} />
      {crew.length > 0 ? (
        <InfoSection title="Équipe" titleGap={8}>
          <InfoRows rows={crew} />
        </InfoSection>
      ) : null}
      {infos.length > 0 ? (
        <InfoSection title="Infos" titleGap={8} paddingTop={16}>
          <InfoRows rows={infos} />
        </InfoSection>
      ) : null}
      <PosterCarousel title="Saga" titles={movie.collection} libraryIds={libraryIds} />
      <PosterCarousel title="Titres similaires" titles={movie.similar} libraryIds={libraryIds} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 48,
  },
  ratings: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
});
