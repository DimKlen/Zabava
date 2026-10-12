import { useLocalSearchParams } from 'expo-router';

import type { MediaType } from '@/domain/types';
import { TitleScreen } from '@/features/title/TitleScreen';

type Params = { type: string; id: string; tab?: string; season?: string; episode?: string };

function toMediaType(type: string): MediaType {
  return type === 'tv' || type === 'anime' ? type : 'movie';
}

export default function TitleDetail() {
  const { type, id } = useLocalSearchParams<Params>();
  return <TitleScreen type={toMediaType(type)} tmdbId={Number(id)} />;
}
