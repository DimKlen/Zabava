import { useLocalSearchParams } from 'expo-router';

import type { MediaType } from '@/domain/types';
import { TitleScreen } from '@/features/title/TitleScreen';

type Params = { type: string; id: string; tab?: string; season?: string; episode?: string };

function toMediaType(type: string): MediaType {
  return type === 'tv' || type === 'anime' ? type : 'movie';
}

export default function TitleDetail() {
  const { type, id, season } = useLocalSearchParams<Params>();
  const seasonNumber = season === undefined ? undefined : Number(season);
  return (
    <TitleScreen
      type={toMediaType(type)}
      tmdbId={Number(id)}
      season={Number.isInteger(seasonNumber) ? seasonNumber : undefined}
    />
  );
}
