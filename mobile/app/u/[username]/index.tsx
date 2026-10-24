import { useLocalSearchParams } from 'expo-router';

import { UserProfileGate } from '@/features/social/UserProfileGate';

export default function User() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <UserProfileGate username={username.toLowerCase()} />;
}
