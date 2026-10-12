import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen';

export default function Genre() {
  const params = useLocalSearchParams<{ type: string; genre: string }>();
  return <PlaceholderScreen name="genre/[type]/[genre]" params={params} />;
}
