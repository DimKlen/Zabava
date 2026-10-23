import { useLocalSearchParams } from 'expo-router';

import { ConnectionsScreen } from '@/features/social/ConnectionsScreen';

export default function Connections() {
  const { username, tab } = useLocalSearchParams<{ username: string; tab?: string }>();
  return (
    <ConnectionsScreen
      username={username}
      initialTab={tab === 'following' ? 'following' : 'followers'}
    />
  );
}
