import { UserPlusIcon, UsersThreeIcon } from 'phosphor-react-native';
import { FlatList, StyleSheet, View } from 'react-native';

import { useProfile } from '@/api/profile';
import { flatItems, useMemberSearch, useRecentProfiles } from '@/api/social';
import { Button } from '@/components/Button';
import { LoadError, showsLoadError } from '@/components/LoadError';
import { MemberRow } from '@/components/MemberRow';
import { SkeletonMemberRow } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import type { Member } from '@/domain/social/members';
import { openInviteSheet } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { openUser } from '../social/navigation';

const SKELETON_ROWS = 3;
/** Résultats à partir de 2 caractères (specs/social/docs/04 §4.6). */
const MIN_QUERY = 2;

type Props = {
  /** Requête envoyée, sans « @ » ni accents. */
  query: string;
  /** La saisie diffère de la requête : on attend la fin de la frappe. */
  typing: boolean;
};

/** Onglet Membres de la recherche. */
export function MemberResults({ query, typing }: Props) {
  if (query.length < MIN_QUERY) return <RecentProfiles />;
  return <Results query={query} typing={typing} />;
}

function Results({ query, typing }: Props) {
  const search = useMemberSearch(query);
  const me = useProfile().data?.username;
  const members = flatItems(search.data?.pages);

  if (typing || (!search.data && !showsLoadError(search))) return <Skeletons />;
  if (showsLoadError(search)) return <LoadError onRetry={() => void search.refetch()} />;
  if (members.length === 0) {
    return (
      <View style={styles.none}>
        <UsersThreeIcon size={36} color={colors.neutral600} />
        <Text style={styles.noneText}>Aucun membre trouvé</Text>
        <Button
          variant="primary"
          height={44}
          icon={UserPlusIcon}
          label="Inviter quelqu'un"
          onPress={openInviteSheet}
          style={styles.noneButton}
        />
      </View>
    );
  }
  return (
    <MemberList
      members={members}
      me={me}
      onEndReached={() => {
        if (search.hasNextPage && !search.isFetchingNextPage) void search.fetchNextPage();
      }}
    />
  );
}

/** Moins de 2 caractères : les 5 derniers profils visités, ou une aide. */
function RecentProfiles() {
  const recent = useRecentProfiles();
  const me = useProfile().data?.username;
  const members = recent.data ?? [];

  if (!recent.data && !showsLoadError(recent)) return <Skeletons />;
  if (members.length === 0) {
    return <Text style={styles.hint}>Tape au moins 2 caractères du pseudo ou du nom.</Text>;
  }
  return (
    <MemberList
      members={members}
      me={me}
      header={
        <Text style={[typography.overline, styles.recentTitle]}>Personnes suivies récemment</Text>
      }
    />
  );
}

function MemberList({
  members,
  me,
  header,
  onEndReached,
}: {
  members: Member[];
  me: string | undefined;
  header?: React.ReactElement;
  onEndReached?: () => void;
}) {
  return (
    <FlatList
      data={members}
      keyExtractor={(member) => member.username}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.list}
      ListHeaderComponent={header}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => (
        <MemberRow
          member={item}
          isMe={item.username === me}
          onPress={() => openUser(item.username)}
        />
      )}
    />
  );
}

function Skeletons() {
  return (
    <View style={styles.skeletons}>
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <SkeletonMemberRow key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingTop: 6,
    paddingBottom: 40,
  },
  recentTitle: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  hint: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.neutral400,
  },
  skeletons: {
    paddingVertical: 6,
  },
  none: {
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  noneText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 16 * 1.3,
    color: colors.text,
  },
  noneButton: {
    marginTop: 6,
  },
});
