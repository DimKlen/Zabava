import { useQuery } from '@tanstack/react-query';

import type { Availability, MediaType, UserTitle } from '@/domain/types';

import { toPosterTitle, type PosterTitle } from './catalog';
import { api } from './http';
import { toAvailability, toMediaType, toUserTitle } from './mappers';
import { whenSettled } from './mutationQueue';
import type { components } from './types';

type ApiTitleDetail = components['schemas']['TitleDetail'];

const DAY = 24 * 60 * 60 * 1000;

export type CastMember = { id: number; name: string; character?: string; profilePath?: string };

/** Fiche titre (`GET /titles/{type}/{tmdbId}`), au format client. */
export type TitleDetail = {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  originalTitle?: string;
  year?: number;
  posterPath?: string;
  backdropPath?: string;
  genres: string[];
  certification?: string;
  runtime?: number;
  imdbRating?: number;
  imdbVotes?: number;
  rtScore?: number;
  overview?: string;
  originalLanguage?: string;
  country?: string;
  studio?: string;
  releaseTheatrical?: string;
  releaseDigital?: string;
  network?: string;
  /** Séries : « En cours », « Terminée » ou « Annulée ». */
  status?: string;
  ended?: boolean;
  /** Séries : saisons annoncées par TMDB (Spéciaux = 0). */
  seasons: { number: number; episodeCount?: number }[];
  availability: Availability;
  trailerKey?: string;
  cast: CastMember[];
  directors: string[];
  writers: string[];
  creators: string[];
  networks: string[];
  /** Autres volets de la saga, triés par date. */
  collection: PosterTitle[];
  similar: PosterTitle[];
  userTitle?: UserTitle;
};

export const titleKey = (type: MediaType, tmdbId: number) => ['title', type, tmdbId] as const;

function toCast(cast: ApiTitleDetail['cast']): CastMember[] {
  return (cast ?? []).flatMap((member) =>
    member.id !== undefined && member.name
      ? [
          {
            id: member.id,
            name: member.name,
            character: member.character,
            profilePath: member.profilePath,
          },
        ]
      : [],
  );
}

function toPosters(items: ApiTitleDetail['similar'], type: MediaType, exceptId?: string) {
  return (items ?? [])
    .map((item) => toPosterTitle(item, type))
    .filter((item): item is PosterTitle => item !== null && item.id !== exceptId);
}

export function toTitleDetail(
  detail: ApiTitleDetail,
  type: MediaType,
  tmdbId: number,
): TitleDetail {
  const resolvedType = toMediaType(detail.type, type);
  const id = detail.id ?? `${resolvedType}-${tmdbId}`;
  const collectionParts = [...(detail.collection?.parts ?? [])].sort((a, b) =>
    (a.releaseDate ?? '9999').localeCompare(b.releaseDate ?? '9999'),
  );
  return {
    id,
    tmdbId: detail.tmdbId ?? tmdbId,
    type: resolvedType,
    title: detail.title ?? '',
    originalTitle: detail.originalTitle,
    year: detail.year,
    posterPath: detail.posterPath,
    backdropPath: detail.backdropPath,
    genres: detail.genres ?? [],
    certification: detail.certification,
    runtime: detail.runtime,
    imdbRating: detail.imdbRating,
    imdbVotes: detail.imdbVotes,
    rtScore: detail.rtScore,
    overview: detail.overview,
    originalLanguage: detail.originalLanguage,
    country: detail.country,
    studio: detail.studio,
    releaseTheatrical: detail.releaseTheatrical,
    releaseDigital: detail.releaseDigital,
    network: detail.network,
    status: detail.status,
    ended: detail.ended,
    seasons: (detail.seasons ?? []).flatMap((season) =>
      season.number === undefined
        ? []
        : [{ number: season.number, episodeCount: season.episodeCount }],
    ),
    availability: toAvailability(detail.availability),
    trailerKey: detail.trailerKey,
    cast: toCast(detail.cast),
    directors: detail.crew?.directors ?? [],
    writers: detail.crew?.writers ?? [],
    creators: detail.crew?.creators ?? [],
    networks: detail.crew?.networks ?? [],
    collection: toPosters(collectionParts, resolvedType, id),
    similar: toPosters(detail.similar, resolvedType).slice(0, 8),
    userTitle: toUserTitle(detail.userTitle, id),
  };
}

export function useTitle(type: MediaType, tmdbId: number) {
  return useQuery({
    queryKey: titleKey(type, tmdbId),
    queryFn: async () => {
      // Le statut de la fiche suit les écritures en file.
      await whenSettled();
      return toTitleDetail(await api<ApiTitleDetail>(`/titles/${type}/${tmdbId}`), type, tmdbId);
    },
    staleTime: DAY,
  });
}
