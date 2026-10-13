import { Redirect, useLocalSearchParams } from 'expo-router';

import { PersonScreen } from '@/features/person/PersonScreen';

export default function Person() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  // Lien invalide : retour à Ma liste.
  if (!Number.isInteger(personId) || personId <= 0) return <Redirect href="/(tabs)/watchlist" />;
  return <PersonScreen id={personId} />;
}
