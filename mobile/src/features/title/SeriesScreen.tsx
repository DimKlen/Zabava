import { DotsThreeIcon } from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useEpisodes } from '@/api/episodes';
import { setTitleAlerts } from '@/api/libraryActions';
import { useProfile } from '@/api/profile';
import type { TitleDetail } from '@/api/titles';
import { useSeriesWatchlist } from '@/api/watchlist';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { RatingChips } from '@/components/RatingChips';
import { RoundIconButton } from '@/components/RoundIconButton';
import { SkeletonBox } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { seriesPlatform } from '@/domain/badge';
import { defaultSeason, seriesInfo } from '@/domain/series';
import { nextEpisodeLine, seriesCrew, seriesInfos, seriesMeta } from '@/domain/seriesDetail';
import { useUiStore } from '@/store/ui';
import { colors, radii } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { CastCarousel } from './CastCarousel';
import { EpisodeSheet } from './EpisodeSheet';
import { EpisodesTab } from './EpisodesTab';
import type { TitlePreview } from './openTitle';
import { InfoRows, InfoSection } from './InfoSection';
import { PosterCarousel } from './PosterCarousel';
import { SeriesActions } from './SeriesActions';
import { openSeriesMenu } from './seriesMenu';
import { Synopsis } from './Synopsis';
import { TitleHeader } from './TitleHeader';
import { TitleBodySkeleton } from './TitleSkeleton';
import { TrailerButton } from './TrailerButton';
import { WhereToWatch } from './WhereToWatch';

type DetailTab = 'episodes' | 'infos';

const DETAIL_TABS = [
  { key: 'episodes', label: 'Épisodes' },
  { key: 'infos', label: 'Infos' },
] as const;

type Props = {
  /** Identifiant de la route (`tv-1399`) : stable du tap jusqu'à la fiche complète. */
  id: string;
  type: 'tv' | 'anime';
  tmdbId: number;
  /** Ce que la liste savait du titre, affiché pendant le chargement. */
  preview?: TitlePreview;
  /** Absente tant que la fiche n'est pas reçue : squelettes sous l'en-tête. */
  series?: TitleDetail & { type: 'tv' | 'anime' };
  /** Erreur de chargement (« Réessayer ») à la place des squelettes. */
  failure?: ReactNode;
  /** Saison passée par la route (carte « prochain épisode », « Commencer »). */
  initialSeason?: number;
  /** Lien profond d'une notification : ouvre la fiche de cet épisode de `initialSeason`. */
  initialEpisode?: number;
};

/**
 * Fiche série ou animé (specs/docs/07 §7.1) : en-tête, suivi, onglets Épisodes / Infos.
 * Le même écran sert du tap à la fiche complète ; les épisodes se chargent en parallèle.
 */
export function SeriesScreen({
  id,
  type,
  tmdbId,
  preview,
  series,
  failure,
  initialSeason,
  initialEpisode,
}: Props) {
  const profile = useProfile().data;
  const myProviderIds = profile?.providerIds ?? [];
  const spoilerProtection = profile?.spoilerProtection ?? false;
  const seriesType = series?.type ?? type;
  const libraryIds = new Set((useSeriesWatchlist(seriesType).data ?? []).map((s) => s.id));
  const episodesQuery = useEpisodes(seriesType, tmdbId);
  const episodes = episodesQuery.data;
  const localAlertsOff = useUiStore((s) => s.alertsOff[series?.id ?? id] ?? false);
  const alertsOn = series?.userTitle ? series.userTitle.notificationsEnabled : !localAlertsOff;

  const [tab, setTab] = useState<DetailTab>('episodes');
  const [openEpisodeId, setOpenEpisodeId] = useState<number>();
  // La saison par défaut est fixée au premier chargement : elle ne saute pas quand on coche.
  const [season, setSeason] = useState<number | undefined>(initialSeason);
  if (season === undefined && episodes && episodes.length > 0) {
    setSeason(defaultSeason(episodes, new Date()));
  }
  // Fiche épisode demandée par le lien : ouverte une fois les épisodes chargés.
  const [pendingEpisode, setPendingEpisode] = useState(initialEpisode);
  if (pendingEpisode !== undefined && episodes) {
    const target = episodes.find((e) => e.season === initialSeason && e.number === pendingEpisode);
    setPendingEpisode(undefined);
    if (target) setOpenEpisodeId(target.id);
  }

  const now = new Date();
  const nextLine = episodes ? nextEpisodeLine(seriesInfo(episodes, now)) : undefined;
  const openMenu = series ? () => openSeriesMenu(series, series.userTitle, alertsOn) : undefined;
  const openEpisode = episodes?.find((episode) => episode.id === openEpisodeId);

  return (
    <>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <TitleHeader
          id={id}
          title={series?.title ?? preview?.title ?? ''}
          posterPath={series?.posterPath ?? preview?.posterPath}
          backdropPath={series?.backdropPath}
          meta={
            series
              ? seriesMeta(series.year, seriesPlatform(series, myProviderIds), series.status)
              : ''
          }
          genres={series?.genres ?? []}
          loading={!series}
          alertsOn={alertsOn}
          onToggleAlerts={series ? () => setTitleAlerts(series, !alertsOn) : undefined}
          extraActions={
            openMenu ? (
              <RoundIconButton
                icon={DotsThreeIcon}
                iconSize={22}
                accessibilityLabel="Plus"
                onPress={openMenu}
              />
            ) : undefined
          }
        />
        {series ? (
          <>
            <RatingChips
              imdbRating={series.imdbRating}
              imdbVotes={series.imdbVotes}
              rtScore={series.rtScore}
              style={styles.ratings}
            />
            {nextLine ? <Text style={styles.nextEpisode}>{nextLine}</Text> : null}
            <SeriesActions
              series={series}
              userTitle={series.userTitle}
              onOpenMenu={() => openSeriesMenu(series, series.userTitle, alertsOn)}
            />
            <UnderlineTabs tabs={DETAIL_TABS} value={tab} onChange={setTab} style={styles.tabs} />

            {tab === 'episodes' ? (
              episodes && season !== undefined ? (
                <EpisodesTab
                  series={series}
                  episodes={episodes}
                  season={season}
                  onSeasonChange={setSeason}
                  spoilerProtection={spoilerProtection}
                  onOpenEpisode={(episode) => setOpenEpisodeId(episode.id)}
                />
              ) : showsLoadError(episodesQuery) ? (
                <LoadError onRetry={() => void episodesQuery.refetch()} />
              ) : episodes ? null : (
                <EpisodesSkeleton />
              )
            ) : (
              <SeriesInfos series={series} myProviderIds={myProviderIds} libraryIds={libraryIds} />
            )}
          </>
        ) : (
          (failure ?? <TitleBodySkeleton series />)
        )}
      </ScrollView>
      {series ? (
        <EpisodeSheet
          series={series}
          allEpisodes={episodes ?? []}
          episode={openEpisode}
          spoilerProtection={spoilerProtection}
          onClose={() => setOpenEpisodeId(undefined)}
        />
      ) : null}
    </>
  );
}

function SeriesInfos({
  series,
  myProviderIds,
  libraryIds,
}: {
  series: TitleDetail;
  myProviderIds: number[];
  libraryIds: Set<string>;
}) {
  const crew = seriesCrew(series.creators, series.networks, series.creatorIds);
  const infos = seriesInfos(series);
  return (
    <View>
      <WhereToWatch availability={series.availability} myProviderIds={myProviderIds} />
      {series.overview ? <Synopsis text={series.overview} /> : null}
      {series.trailerKey ? (
        <TrailerButton
          titleId={series.id}
          trailerKey={series.trailerKey}
          backdropPath={series.backdropPath}
        />
      ) : null}
      <CastCarousel cast={series.cast} />
      {crew.length > 0 ? (
        <InfoSection title="Créateurs" titleGap={8}>
          <InfoRows rows={crew} />
        </InfoSection>
      ) : null}
      {infos.length > 0 ? (
        <InfoSection title="Infos" titleGap={8} paddingTop={16}>
          <InfoRows rows={infos} />
        </InfoSection>
      ) : null}
      <PosterCarousel title="Titres similaires" titles={series.similar} libraryIds={libraryIds} />
    </View>
  );
}

/** Chargement des épisodes : la forme des lignes (vignette 96 × 54 + titre). */
function EpisodesSkeleton() {
  return (
    <View style={styles.skeletons}>
      {[0, 1, 2].map((key) => (
        <View key={key} style={styles.skeletonRow}>
          <SkeletonBox width={96} height={54} radius={radii.rSm} />
          <SkeletonBox height={14} radius={radii.rXs} style={styles.skeletonBar} />
        </View>
      ))}
    </View>
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
  nextEpisode: {
    ...typography.label,
    paddingTop: 12,
    paddingHorizontal: 16,
    color: colors.accent300,
  },
  tabs: {
    paddingTop: 12,
  },
  skeletons: {
    gap: 16,
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonBar: {
    flex: 1,
  },
});
