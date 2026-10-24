import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { GearSixIcon, UserPlusIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile, type Profile } from '@/api/profile';
import { movieWatchlistQuery, seriesWatchlistQuery } from '@/api/watchlist';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ScreenHeader } from '@/components/ScreenHeader';
import {
  defaultSegment,
  myMovieGrid,
  mySeriesGrid,
  segmentFor,
  type MovieSegment,
  type ProfileSegment,
  type SeriesSegment,
} from '@/domain/social/profileLists';
import type { MediaType } from '@/domain/types';
import { openInviteSheet } from '@/store/ui';
import { colors } from '@/theme/tokens';

import { ProfileContent } from './ProfileContent';
import { ProfileHeader } from './ProfileHeader';
import { openConnections } from './navigation';

/** Mon profil, onglet Profil (specs/social/docs/04 §4.2). Listes tirées de Ma liste (hors ligne). */
export function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const query = useProfile();
  const profile = query.data;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      {profile?.username ? (
        <MyProfile
          profile={profile}
          username={profile.username}
          onRefresh={() => query.refetch()}
        />
      ) : (
        <>
          <Bar />
          {showsLoadError(query) ? <LoadError onRetry={() => void query.refetch()} /> : null}
        </>
      )}
    </View>
  );
}

function Bar() {
  return (
    <ScreenHeader
      title="Profil"
      actions={
        <>
          <Button
            variant="icon"
            height={44}
            icon={UserPlusIcon}
            iconSize={22}
            color={colors.text}
            accessibilityLabel="Inviter"
            onPress={openInviteSheet}
          />
          <Button
            variant="icon"
            height={44}
            icon={GearSixIcon}
            iconSize={22}
            color={colors.text}
            accessibilityLabel="Réglages"
            onPress={() => router.push('/settings')}
          />
        </>
      }
    />
  );
}

function MyProfile({
  profile,
  username,
  onRefresh,
}: {
  profile: Profile;
  username: string;
  onRefresh: () => Promise<unknown>;
}) {
  const [tab, setTab] = useState<MediaType>('movie');
  const [segment, setSegment] = useState<ProfileSegment>(defaultSegment('movie'));
  const [refreshing, setRefreshing] = useState(false);
  const movies = useQuery({ ...movieWatchlistQuery(), enabled: tab === 'movie' });
  const series = useQuery({
    ...seriesWatchlistQuery(tab === 'anime' ? 'anime' : 'tv'),
    enabled: tab !== 'movie',
  });
  const list = tab === 'movie' ? movies : series;

  let items;
  if (tab === 'movie') {
    items = movies.data ? myMovieGrid(movies.data, segment as MovieSegment) : undefined;
  } else {
    items = series.data
      ? mySeriesGrid(series.data, segment as SeriesSegment, new Date())
      : undefined;
  }

  const changeTab = (next: MediaType) => {
    setTab(next);
    setSegment(segmentFor(next, segment));
  };

  const refresh = () => {
    setRefreshing(true);
    void Promise.all([onRefresh(), list.refetch()]).finally(() => setRefreshing(false));
  };

  const name = profile.displayName || username;

  return (
    <ProfileContent
      header={
        <>
          <Bar />
          <ProfileHeader
            isMe
            profile={{
              username,
              displayName: name,
              avatarUrl: profile.avatarUrl,
              isPrivate: profile.isPrivate ?? false,
              followersCount: profile.followersCount ?? 0,
              followingCount: profile.followingCount ?? 0,
            }}
            onFollowers={() => openConnections(username, 'followers')}
            onFollowing={() => openConnections(username, 'following')}
          />
          <View style={styles.buttons}>
            <Button
              variant="secondary"
              height={44}
              label="Modifier le profil"
              onPress={() => router.push('/profile/edit')}
              style={styles.button}
            />
            <Button
              variant="primary"
              height={44}
              icon={UserPlusIcon}
              label="Inviter"
              onPress={openInviteSheet}
              style={styles.button}
            />
          </View>
        </>
      }
      tab={tab}
      segment={segment}
      onTab={changeTab}
      onSegment={setSegment}
      items={items}
      error={showsLoadError(list)}
      onRetry={() => void list.refetch()}
      refreshing={refreshing}
      onRefresh={refresh}
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  button: {
    flex: 1,
  },
});
