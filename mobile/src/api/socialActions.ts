/**
 * Actions sociales (specs/social/docs/07 §3) : refusées hors ligne, mises à jour optimistes de
 * toutes les occurrences du membre en cache, retour en arrière si le serveur refuse.
 *
 * Chaque action sait se défaire elle-même (`revert`) : un échec ou « Annuler » ne touche que le
 * membre concerné, jamais une autre action faite entre-temps.
 */
import { onlineManager, type QueryKey } from '@tanstack/react-query';
import { FlagIcon, ShareNetworkIcon, UserMinusIcon } from 'phosphor-react-native';
import { Share } from 'react-native';

import { firstName, stateAfterFollow, type Member } from '@/domain/social/members';
import { hapticLight } from '@/lib/haptics';
import { profileLink } from '@/lib/links';
import { openActionSheet, showToast } from '@/store/ui';

import { ApiError, api } from './http';
import { profileKey, type Profile } from './profile';
import { queryClient } from './queryClient';
import { followRequestsKey, userKey, type Page, type UserProfile } from './social';

export const OFFLINE = 'Connexion requise';
export const SAVE_FAILED = "Impossible d'enregistrer, réessaie";
const FOLLOW_LIMIT = "Tu as atteint la limite de 200 demandes d'ami par jour";

/** Requêtes où un membre peut apparaître (profils, listes, recherche, fil, fiches). */
const MEMBER_ROOTS = new Set([
  'user',
  'members',
  'followRequests',
  'recentProfiles',
  'feed',
  'title',
]);

const isMemberQuery = ({ queryKey }: { queryKey: QueryKey }) =>
  MEMBER_ROOTS.has(String(queryKey[0]));

/** Hors ligne : rien ne change, toast « Connexion requise ». */
export function requireOnline(): boolean {
  if (onlineManager.isOnline()) return true;
  showToast(OFFLINE);
  return false;
}

function myUsername(): string | undefined {
  return queryClient.getQueryData<Profile>(profileKey)?.username ?? undefined;
}

// ─── Mises à jour du cache ─────────────────────────────────────────────────

/** Copie de `value` où chaque objet membre `username` reçoit `patch` (références gardées sinon). */
function patchDeep(value: unknown, username: string, patch: Partial<Member>): unknown {
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const patched = patchDeep(item, username, patch);
      changed ||= patched !== item;
      return patched;
    });
    return changed ? next : value;
  }
  if (value === null || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  if (record.username === username && 'followState' in record) return { ...record, ...patch };
  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    const patched = patchDeep(child, username, patch);
    changed ||= patched !== child;
    next[key] = patched;
  }
  return changed ? next : value;
}

/** Met à jour toutes les occurrences en cache d'un membre (profil, listes, recherche, fiches…). */
export function patchMemberEverywhere(username: string, patch: Partial<Member>): void {
  queryClient.setQueriesData({ predicate: isMemberQuery }, (data: unknown) =>
    patchDeep(data, username, patch),
  );
}

/** Ajoute `delta` au compteur d'amis d'un profil en cache. */
function bumpFriends(username: string | undefined, delta: number): void {
  if (!username) return;
  queryClient.setQueryData<UserProfile>(userKey(username), (profile) =>
    profile ? { ...profile, friendsCount: Math.max(0, profile.friendsCount + delta) } : profile,
  );
  if (username !== myUsername()) return;
  queryClient.setQueryData<Profile>(profileKey, (profile) =>
    profile
      ? { ...profile, friendsCount: Math.max(0, (profile.friendsCount ?? 0) + delta) }
      : profile,
  );
}

/** Nous devenons amis (+1) ou ne le sommes plus (−1) : son compteur et le mien. */
function countFriend(username: string, delta: number): void {
  bumpFriends(username, delta);
  bumpFriends(myUsername(), delta);
}

type MemberPages = { pages: Page<Member>[]; pageParams: unknown[] };

/** Retire un membre des pages en cache de mes amis. */
function removeFromMyFriends(username: string): void {
  const me = myUsername();
  if (!me) return;
  queryClient.setQueriesData<MemberPages>(
    { queryKey: ['user', me, 'friends'] },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => item.username !== username),
        })),
      },
  );
}

/** Recharge mes amis : un ami y arrive ou y revient. */
function reloadMyFriends(): void {
  const me = myUsername();
  if (me) void queryClient.invalidateQueries({ queryKey: ['user', me, 'friends'] });
}

/** Après un changement d'amitié : fil et blocs des fiches à recharger. */
function invalidateSocial(): void {
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === 'feed' || (queryKey[0] === 'title' && queryKey.at(-1) === 'social'),
  });
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return FOLLOW_LIMIT;
  return SAVE_FAILED;
}

type Change = { apply: () => void; revert: () => void; request: () => Promise<unknown> };

/** Applique le changement tout de suite, l'envoie, le défait (seul) si le serveur refuse. */
async function send({ apply, revert, request }: Change): Promise<boolean> {
  apply();
  try {
    await request();
    invalidateSocial();
    return true;
  } catch (error) {
    revert();
    showToast(failureMessage(error));
    return false;
  }
}

/** L'action inverse, pour « Annuler ». */
function inverse(change: Change, request: () => Promise<unknown>): Change {
  return { apply: change.revert, revert: change.apply, request };
}

// ─── Amis ──────────────────────────────────────────────────────────────────

/** « Ajouter en ami » : une demande, ou l'amitié s'il m'en avait déjà envoyé une. */
export function followMember(member: Member): void {
  if (!requireOnline()) return;
  const next = stateAfterFollow(member);
  hapticLight();
  if (next === 'pending') showToast(`Demande envoyée à @${member.username}`);
  let actual = next;
  const putBack = { requests: () => undefined as void };
  const becomeFriends = () => {
    patchMemberEverywhere(member.username, { followState: 'following', followsMe: true });
    countFriend(member.username, 1);
  };
  const stopBeingFriends = () => countFriend(member.username, -1);
  void send({
    apply: () => {
      if (next === 'following') {
        // Sa demande disparaît de mes demandes reçues.
        putBack.requests = takeRequests(new Set([member.username]));
        countRequests(-1);
        becomeFriends();
      } else {
        patchMemberEverywhere(member.username, { followState: 'pending' });
      }
    },
    revert: () => {
      patchMemberEverywhere(member.username, {
        followState: member.followState,
        followsMe: member.followsMe,
      });
      if (actual === 'following') stopBeingFriends();
      if (next === 'following') {
        putBack.requests();
        countRequests(1);
      }
    },
    request: () =>
      api<{ status?: string }>(`/users/${member.username}/follow`, { method: 'POST' }).then(
        ({ status }) => {
          // Le serveur a le dernier mot (sa demande est arrivée entre-temps…).
          actual = status === 'accepted' ? 'following' : 'pending';
          if (actual === next) return;
          if (actual === 'following') becomeFriends();
          else {
            patchMemberEverywhere(member.username, { followState: 'pending' });
            stopBeingFriends();
          }
        },
      ),
  }).then((done) => {
    if (!done || actual !== 'following') return;
    showToast(friendsToast(member));
    reloadMyFriends();
  });
}

/** « Léa et toi êtes maintenant amis ». */
function friendsToast(member: Member): string {
  return `${firstName(member.displayName)} et toi êtes maintenant amis`;
}

/** Retirer de mes amis : toast avec « Annuler », qui rétablit l'amitié d'origine. */
export function removeFriend(member: Member): void {
  if (!requireOnline()) return;
  const me = myUsername();
  // Ma liste d'amis telle quelle, pour remettre la ligne à sa place.
  const lists = me
    ? queryClient.getQueriesData<MemberPages>({ queryKey: ['user', me, 'friends'] })
    : [];
  const change: Change = {
    apply: () => {
      patchMemberEverywhere(member.username, { followState: 'none', followsMe: false });
      countFriend(member.username, -1);
      removeFromMyFriends(member.username);
    },
    revert: () => {
      patchMemberEverywhere(member.username, { followState: 'following', followsMe: true });
      countFriend(member.username, 1);
      // Sans recharger : une relecture avant la fin de la restauration reviendrait sans lui.
      for (const [key, data] of lists) queryClient.setQueryData(key, data);
    },
    request: () => api(`/users/${member.username}/follow`, { method: 'DELETE' }),
  };
  void send(change).then((done) => {
    if (!done) return;
    showToast(`@${member.username} ne fait plus partie de tes amis`, () => {
      if (!requireOnline()) return;
      // Le serveur rétablit l'amitié d'origine (mêmes dates).
      void send(
        inverse(change, () =>
          api(`/users/${member.username}/follow`, { method: 'POST' }).then(reloadMyFriends),
        ),
      );
    });
  });
}

/** Annuler une demande envoyée. */
export function cancelRequest(member: Member): void {
  if (!requireOnline()) return;
  showToast('Demande annulée');
  void send({
    apply: () => patchMemberEverywhere(member.username, { followState: 'none' }),
    revert: () => patchMemberEverywhere(member.username, { followState: 'pending' }),
    request: () => api(`/users/${member.username}/follow`, { method: 'DELETE' }),
  });
}

/** Tap sur le bouton d'ami, selon son état (specs/social/docs/03 › FollowButton). */
export function pressFollow(member: Member): void {
  switch (member.followState) {
    case 'pending':
      cancelRequest(member);
      return;
    case 'following':
      openActionSheet({
        title: `@${member.username}`,
        options: [
          {
            label: 'Retirer de mes amis',
            icon: UserMinusIcon,
            onPress: () => removeFriend(member),
          },
        ],
      });
      return;
    default:
      // « Accepter » (sa demande reçue) ou « Ajouter en ami ».
      followMember(member);
  }
}

// ─── Demandes d'ami reçues ─────────────────────────────────────────────────

/** Retire des demandes en cache ; renvoie de quoi les remettre à leur place. */
function takeRequests(usernames: ReadonlySet<string>): () => void {
  const before = queryClient.getQueryData<MemberPages>(followRequestsKey);
  const removed: { page: number; index: number; member: Member }[] = [];
  before?.pages.forEach((page, p) =>
    page.items.forEach((member, index) => {
      if (usernames.has(member.username)) removed.push({ page: p, index, member });
    }),
  );
  queryClient.setQueryData<MemberPages>(
    followRequestsKey,
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          items: page.items.filter((item) => !usernames.has(item.username)),
        })),
      },
  );
  return () =>
    queryClient.setQueryData<MemberPages>(followRequestsKey, (data) => {
      if (!data) return data;
      const pages = data.pages.map((page) => ({ ...page, items: [...page.items] }));
      for (const { page, index, member } of removed) {
        const items = pages[page]?.items;
        if (items && !items.some((item) => item.username === member.username)) {
          items.splice(Math.min(index, items.length), 0, member);
        }
      }
      return { ...data, pages };
    });
}

/** Mon compteur de demandes reçues (ligne et badge de l'onglet Profil). */
function countRequests(delta: number): void {
  queryClient.setQueryData<Profile>(profileKey, (profile) =>
    profile
      ? { ...profile, followRequestsCount: Math.max(0, (profile.followRequestsCount ?? 0) + delta) }
      : profile,
  );
}

/** Accepter : la ligne disparaît, nous sommes amis, toast « Léa et toi êtes maintenant amis ». */
export function acceptRequest(member: Member): void {
  acceptRequests([member], friendsToast(member), (m) =>
    api(`/me/follow-requests/${m[0]?.username}/accept`, { method: 'POST' }),
  );
}

/** « Tout accepter » : toast « 4 demandes acceptées ». */
export function acceptAllRequests(members: readonly Member[]): void {
  acceptRequests(members, `${members.length} demandes acceptées`, () =>
    api('/me/follow-requests/accept-all', { method: 'POST' }),
  );
}

function acceptRequests(
  members: readonly Member[],
  toast: string,
  request: (members: readonly Member[]) => Promise<unknown>,
): void {
  if (members.length === 0 || !requireOnline()) return;
  let putBack = () => undefined as void;
  void send({
    apply: () => {
      putBack = takeRequests(new Set(members.map((m) => m.username)));
      countRequests(-members.length);
      for (const member of members) {
        patchMemberEverywhere(member.username, { followState: 'following', followsMe: true });
        countFriend(member.username, 1);
      }
    },
    revert: () => {
      putBack();
      countRequests(members.length);
      for (const member of members) {
        patchMemberEverywhere(member.username, { followState: 'requested', followsMe: false });
        countFriend(member.username, -1);
      }
    },
    request: () => request(members),
  }).then((done) => {
    if (!done) return;
    showToast(toast);
    reloadMyFriends();
  });
}

/** Refuser : la ligne disparaît, sans toast ; la personne n'est pas prévenue. */
export function declineRequest(member: Member): void {
  if (!requireOnline()) return;
  let putBack = () => undefined as void;
  void send({
    apply: () => {
      putBack = takeRequests(new Set([member.username]));
      countRequests(-1);
      patchMemberEverywhere(member.username, { followState: 'none' });
    },
    revert: () => {
      putBack();
      countRequests(1);
      patchMemberEverywhere(member.username, { followState: 'requested' });
    },
    request: () => api(`/me/follow-requests/${member.username}/decline`, { method: 'POST' }),
  });
}

// ─── Signalement et partage ────────────────────────────────────────────────

const REPORT_REASONS = [
  { reason: 'inappropriate', label: 'Pseudo ou avatar inapproprié' },
  { reason: 'impersonation', label: "Usurpation d'identité" },
  { reason: 'spam', label: 'Spam' },
] as const;

/** Signaler : choix du motif, puis envoi. */
export function reportMember(member: Member): void {
  if (!requireOnline()) return;
  openActionSheet({
    title: `Signaler @${member.username}`,
    options: REPORT_REASONS.map(({ reason, label }) => ({
      label,
      onPress: () => {
        if (!requireOnline()) return;
        api(`/users/${member.username}/report`, { method: 'POST', body: { reason } })
          .then(() => showToast('Signalement envoyé, merci'))
          .catch(() => showToast(SAVE_FAILED));
      },
    })),
  });
}

/** Feuille de partage du téléphone avec le lien du profil. */
export function shareProfile(username: string): void {
  void Share.share({ message: profileLink(username) }).catch(() => undefined);
}

/** Menu « … » d'un autre profil (specs/social/docs/04 §4.4). */
export function openMemberMenu(member: Member): void {
  openActionSheet({
    title: `@${member.username}`,
    options: [
      {
        label: 'Partager le profil',
        icon: ShareNetworkIcon,
        onPress: () => shareProfile(member.username),
      },
      ...(member.followState === 'following'
        ? [
            {
              label: 'Retirer de mes amis',
              icon: UserMinusIcon,
              onPress: () => removeFriend(member),
            },
          ]
        : []),
      { label: 'Signaler', icon: FlagIcon, onPress: () => reportMember(member) },
    ],
  });
}
