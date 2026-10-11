import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen';

type Params = { type: string; id: string; tab?: string; season?: string; episode?: string };

export default function TitleDetail() {
  const params = useLocalSearchParams<Params>();
  return <PlaceholderScreen name="title/[type]/[id]" params={params} />;
}
