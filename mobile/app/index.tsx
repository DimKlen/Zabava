import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen';

// Étape 4 : deviendra la garde d'auth (specs/docs/04-navigation.md §2).
export default function Index() {
  return (
    <PlaceholderScreen
      name="index"
      links={[
        { label: '/login', href: '/login' },
        { label: '/onboarding/region', href: '/onboarding/region' },
        { label: '/onboarding/platforms', href: '/onboarding/platforms' },
        { label: '/onboarding/titles', href: '/onboarding/titles' },
        { label: '/onboarding/notifications', href: '/onboarding/notifications' },
        { label: '/(tabs)/watchlist', href: '/(tabs)/watchlist' },
        { label: '/(tabs)/discover', href: '/(tabs)/discover' },
        { label: '/(tabs)/upcoming', href: '/(tabs)/upcoming' },
        { label: '/(tabs)/profile', href: '/(tabs)/profile' },
        { label: '/title/movie/693134', href: '/title/movie/693134' },
        {
          label: '/title/tv/136315?tab=episodes&season=4',
          href: '/title/tv/136315?tab=episodes&season=4',
        },
        { label: '/person/505710', href: '/person/505710' },
        { label: '/genre/movie/28', href: '/genre/movie/28' },
        { label: '/search', href: '/search' },
      ]}
    />
  );
}
