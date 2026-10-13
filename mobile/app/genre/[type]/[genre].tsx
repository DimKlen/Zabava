import { Redirect, useLocalSearchParams } from 'expo-router';

import { GENRES } from '@/domain/advancedSearch';
import { GenreScreen } from '@/features/discover/GenreScreen';

const TYPES = ['movie', 'tv', 'anime'] as const;

export default function Genre() {
  const params = useLocalSearchParams<{ type: string; genre: string }>();
  const type = TYPES.find((t) => t === params.type);
  const genre = GENRES.find((g) => g.key === params.genre)?.key;
  // Lien invalide : retour à Découvrir.
  if (!type || !genre) return <Redirect href="/(tabs)/discover" />;
  return <GenreScreen type={type} genre={genre} />;
}
