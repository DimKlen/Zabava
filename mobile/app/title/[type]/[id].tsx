import { useLocalSearchParams } from 'expo-router';

import type { MediaType } from '@/domain/types';
import { TitleScreen } from '@/features/title/TitleScreen';

type Params = { type: string; id: string; tab?: string; season?: string; episode?: string };

function toMediaType(type: string): MediaType {
  return type === 'tv' || type === 'anime' ? type : 'movie';
}

function toInteger(value: string | undefined): number | undefined {
  const number = value === undefined ? undefined : Number(value);
  return Number.isInteger(number) ? number : undefined;
}

export default function TitleDetail() {
  const { type, id, season, episode } = useLocalSearchParams<Params>();
  const seasonNumber = toInteger(season);
  // Un épisode n'a de sens qu'avec sa saison.
  const episodeNumber = seasonNumber === undefined ? undefined : toInteger(episode);
  return (
    <TitleScreen
      // Nouveau lien vers la même fiche (notification) : saison et épisode repris à zéro.
      key={`${season ?? ''}-${episode ?? ''}`}
      type={toMediaType(type)}
      tmdbId={Number(id)}
      season={seasonNumber}
      episode={episodeNumber}
    />
  );
}
