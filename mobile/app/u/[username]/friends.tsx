import { useLocalSearchParams } from 'expo-router';

import { FriendsScreen } from '@/features/social/FriendsScreen';

export default function Friends() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <FriendsScreen username={username} />;
}
