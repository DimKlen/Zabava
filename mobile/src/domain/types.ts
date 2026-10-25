/** Modèle client — specs/docs/10-etat-et-donnees-client.md §1. */

export type MediaType = 'movie' | 'tv' | 'anime';

export type Provider = {
  id: number;
  name: string;
  short: string;
  logoPath?: string;
  link?: string;
  /** Pays (ISO 3166-1) où la plateforme propose le titre. */
  countries?: string[];
};

export type Availability = {
  sub: Provider[];
  rent: Provider[];
  buy: Provider[];
  link?: string;
};

export type Episode = {
  id: number;
  season: number;
  number: number;
  name: string;
  overview?: string;
  stillPath?: string;
  airstamp?: string;
  runtime?: number;
  imdbRating?: number;
};

export type Season = {
  number: number;
  name: string;
  episodeCount: number;
  airDate?: string;
  episodes: Episode[];
};

export type Title = {
  /** `${type}-${tmdbId}` */
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
  /** Minutes (épisode moyen pour les séries). */
  runtime?: number;
  imdbRating?: number;
  imdbVotes?: string;
  rtScore?: number;
  overview?: string;
  originalLanguage?: string;
  country?: string;
  studio?: string;
  // Films
  releaseTheatrical?: string;
  releaseDigital?: string;
  collectionId?: number;
  // Séries
  status?: 'En cours' | 'Terminée' | 'Annulée';
  network?: string;
  ended?: boolean;
  seasons?: Season[];
  availability: Availability;
};

export type UserTitle = {
  titleId: string;
  status: 'towatch' | 'watched' | 'following' | 'abandoned';
  addedAt: string;
  watchedAt?: string;
  notificationsEnabled: boolean;
  /** Film vu : ma note de 1 à 10 et mon commentaire, facultatifs, visibles par moi seul. */
  rating?: number;
  comment?: string;
};

/** titleId → `${saison}:${épisode}` → watchedAt */
export type WatchedEpisodes = Record<string, Record<string, string>>;
