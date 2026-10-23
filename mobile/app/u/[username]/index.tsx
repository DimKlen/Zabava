import { useLocalSearchParams } from 'expo-router';

import { UserProfileScreen } from '@/features/social/UserProfileScreen';

export default function User() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <UserProfileScreen key={username} username={username} />;
}
