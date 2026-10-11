import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen';

export default function Person() {
  const params = useLocalSearchParams<{ id: string }>();
  return <PlaceholderScreen name="person/[id]" params={params} />;
}
