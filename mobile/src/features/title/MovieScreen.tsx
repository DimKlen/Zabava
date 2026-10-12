import { ScrollView, StyleSheet } from 'react-native';

import { setTitleAlerts } from '@/api/libraryActions';
import { useProfile } from '@/api/profile';
import type { TitleDetail } from '@/api/titles';
import { useMovieWatchlist } from '@/api/watchlist';
import { RatingChips } from '@/components/RatingChips';
import { movieCrew, movieInfos, movieMeta, movieStatus } from '@/domain/movieDetail';
import { REGIONS } from '@/domain/onboarding';
import { useUiStore } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { CastCarousel } from './CastCarousel';
import { InfoRows, InfoSection } from './InfoSection';
import { MovieActions } from './MovieActions';
import { PosterCarousel } from './PosterCarousel';
import { StatusBanner } from './StatusBanner';
import { Synopsis } from './Synopsis';
import { TitleHeader } from './TitleHeader';
import { TrailerButton } from './TrailerButton';
import { WhereToWatch } from './WhereToWatch';

/** Fiche film complète (specs/docs/07 §7.1). */
export function MovieScreen({ movie }: { movie: TitleDetail }) {
  const profile = useProfile().data;
  const myProviderIds = profile?.providerIds ?? [];
  const regionName =
    REGIONS.find((r) => r.value === profile?.region)?.label ?? profile?.region ?? '';
  const libraryIds = new Set((useMovieWatchlist().data ?? []).map((film) => film.id));
  const localAlertsOff = useUiStore((s) => s.alertsOff[movie.id] ?? false);
  const alertsOn = movie.userTitle ? movie.userTitle.notificationsEnabled : !localAlertsOff;

  const crew = movieCrew(movie.directors, movie.writers);
  const infos = movieInfos(movie, regionName);
  const hasRating = movie.imdbRating !== undefined || movie.rtScore !== undefined;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TitleHeader
        id={movie.id}
        title={movie.title}
        posterPath={movie.posterPath}
        backdropPath={movie.backdropPath}
        meta={movieMeta(movie)}
        genres={movie.genres}
        alertsOn={alertsOn}
        onToggleAlerts={() => setTitleAlerts(movie, !alertsOn)}
      />
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
      {movie.trailerKey ? (
        <TrailerButton
          titleId={movie.id}
          trailerKey={movie.trailerKey}
          backdropPath={movie.backdropPath}
        />
      ) : null}
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
    </ScrollView>
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
