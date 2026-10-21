import { Redirect, useLocalSearchParams } from 'expo-router';

import { StudioScreen } from '@/features/studio/StudioScreen';

export default function Studio() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const studioId = Number(id);
  // Lien invalide : retour à Ma liste.
  if (!Number.isInteger(studioId) || studioId <= 0) return <Redirect href="/(tabs)/watchlist" />;
  return <StudioScreen id={studioId} name={name ?? ''} />;
}
