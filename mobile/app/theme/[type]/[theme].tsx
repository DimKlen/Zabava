import { Redirect, useLocalSearchParams } from 'expo-router';

import { isMoodTheme } from '@/domain/themes';
import { GenreScreen } from '@/features/discover/GenreScreen';

const TYPES = ['movie', 'tv', 'anime'] as const;

export default function Theme() {
  const params = useLocalSearchParams<{ type: string; theme: string }>();
  const type = TYPES.find((t) => t === params.type);
  // Lien invalide : retour à Découvrir.
  if (!type || !params.theme || !isMoodTheme(params.theme)) {
    return <Redirect href="/(tabs)/discover" />;
  }
  return <GenreScreen type={type} mood={params.theme} />;
}
