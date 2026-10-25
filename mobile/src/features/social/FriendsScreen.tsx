import { router } from 'expo-router';
import { CaretLeftIcon, MagnifyingGlassIcon, UsersThreeIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/api/profile';
import { flatItems, useFriends, useUserProfile } from '@/api/social';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { MemberRow } from '@/components/MemberRow';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SkeletonMemberRow } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { firstName } from '@/domain/social/members';
import { stripAccents } from '@/domain/social/username';
import { goBack } from '@/lib/navigation';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { openUser } from './navigation';

/** Au-delà, le filtre passe par le serveur (`?q=`). */
const LOCAL_FILTER_MAX = 200;
const FILTER_DELAY_MS = 300;

/** Amis d'un profil (specs/social/docs/04 §4.5, une seule liste depuis les amis réciproques). */
export function FriendsScreen({ username }: { username: string }) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('');
  const me = useProfile().data?.username;
  const owner = useUserProfile(username).data;
  const isMine = username === me;
  const title = isMine ? 'Mes amis' : owner ? `Amis de ${firstName(owner.displayName)}` : '';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <OfflineBanner />
      <View style={styles.bar}>
        <Button
          variant="icon"
          height={44}
          icon={CaretLeftIcon}
          iconSize={22}
          color={colors.text}
          accessibilityLabel="Retour"
          onPress={goBack}
        />
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {title}
        </Text>
      </View>
      <View style={styles.filter}>
        <TextField
          height={40}
          icon={MagnifyingGlassIcon}
          value={filter}
          onChangeText={setFilter}
          placeholder="Filtrer"
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel="Filtrer"
        />
      </View>
      <FriendsList username={username} filter={filter} me={me} isMine={isMine} />
    </View>
  );
}

function FriendsList({
  username,
  filter,
  me,
  isMine,
}: {
  username: string;
  filter: string;
  me: string | undefined;
  isMine: boolean;
}) {
  const all = useFriends(username, '');
  const loaded = flatItems(all.data?.pages);
  // Tout est chargé et la liste est courte : filtre local, sans requête.
  const local = Boolean(all.data) && !all.hasNextPage && loaded.length <= LOCAL_FILTER_MAX;
  const query = stripAccents(useDebouncedValue(filter, FILTER_DELAY_MS).trim());
  const remote = useFriends(username, local ? '' : query);
  const source = local || !query ? all : remote;

  const needle = stripAccents(filter.trim());
  const members = local
    ? loaded.filter(
        (member) =>
          !needle ||
          stripAccents(member.username).includes(needle) ||
          stripAccents(member.displayName).includes(needle),
      )
    : flatItems(source.data?.pages);

  if (showsLoadError(source)) return <LoadError onRetry={() => void source.refetch()} />;
  if (!source.data) return <RowsSkeleton />;

  return (
    <FlatList
      data={members}
      keyExtractor={(member) => member.username}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <MemberRow
          member={item}
          isMe={item.username === me}
          onPress={() => openUser(item.username)}
        />
      )}
      onEndReached={() => {
        if (source.hasNextPage && !source.isFetchingNextPage) void source.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={<Empty isMine={isMine} filtered={Boolean(needle)} />}
    />
  );
}

function Empty({ isMine, filtered }: { isMine: boolean; filtered: boolean }) {
  if (filtered) return <EmptyState icon={UsersThreeIcon} title="Aucun membre ne correspond" />;
  if (!isMine) return <EmptyState icon={UsersThreeIcon} title="Rien ici pour l'instant" />;
  return (
    <EmptyState
      icon={UsersThreeIcon}
      title="Tu n'as pas encore d'amis"
      action={{
        label: 'Ajouter un ami',
        onPress: () => router.push({ pathname: '/search', params: { tab: 'members' } }),
      }}
    />
  );
}

/** Lignes de 60 avec un cercle de 44 pendant le chargement. */
function RowsSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2, 3, 4].map((row) => (
        <SkeletonMemberRow key={row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
  },
  filter: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  list: {
    paddingBottom: 40,
  },
});
