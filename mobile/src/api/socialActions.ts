/**
 * Actions sociales (specs/social/docs/07 §3) : refusées hors ligne, mises à jour optimistes de
 * toutes les occurrences du membre en cache, retour en arrière si le serveur refuse.
 *
 * Chaque action sait se défaire elle-même (`revert`) : un échec ou « Annuler » ne touche que le
 * membre concerné, jamais une autre action faite entre-temps.
 */
import { onlineManager, type QueryKey } from '@tanstack/react-query';
import { FlagIcon, ProhibitIcon, ShareNetworkIcon, UserMinusIcon } from 'phosphor-react-native';
import { Share } from 'react-native';

import { firstName, stateAfterFollow, type Member } from '@/domain/social/members';
import { hapticLight } from '@/lib/haptics';
import { profileLink } from '@/lib/links';
import { openActionSheet, openDialog, showToast } from '@/store/ui';

import { ApiError, api } from './http';
import { profileKey, type Profile } from './profile';
import { queryClient } from './queryClient';
import {
  followRequestsKey,
  userKey,
  type ConnectionsKind,
  type Page,
  type UserProfile,
} from './social';

export const OFFLINE = 'Connexion requise';
export const SAVE_FAILED = "Impossible d'enregistrer, réessaie";
const FOLLOW_LIMIT = 'Tu as atteint la limite de 200 abonnements par jour';
const CANNOT_FOLLOW = 'Impossible de suivre ce profil';

/** Requêtes où un membre peut apparaître (profils, listes, recherche, fil, fiches). */
const MEMBER_ROOTS = new Set([
  'user',
  'members',
  'followRequests',
  'blocks',
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

/** Ajoute `followers` / `following` aux compteurs d'un profil en cache (et du mien). */
function bumpCounts(username: string | undefined, followers: number, following: number): void {
  if (!username) return;
  queryClient.setQueryData<UserProfile>(userKey(username), (profile) =>
    profile
      ? {
          ...profile,
          followersCount: Math.max(0, profile.followersCount + followers),
          followingCount: Math.max(0, profile.followingCount + following),
        }
      : profile,
  );
  if (username !== myUsername()) return;
  queryClient.setQueryData<Profile>(profileKey, (profile) =>
    profile
      ? {
          ...profile,
          followersCount: Math.max(0, (profile.followersCount ?? 0) + followers),
          followingCount: Math.max(0, (profile.followingCount ?? 0) + following),
        }
      : profile,
  );
}

/** Je suis `username` (+1) ou plus (−1) : ses abonnés et mes abonnements. */
function countFollow(username: string, delta: number): void {
  bumpCounts(username, delta, 0);
  bumpCounts(myUsername(), 0, delta);
}

/** `username` me suit (+1) ou plus (−1) : mes abonnés et ses abonnements. */
function countFollower(username: string, delta: number): void {
  bumpCounts(myUsername(), delta, 0);
  bumpCounts(username, 0, delta);
}

type MemberPages = { pages: Page<Member>[]; pageParams: unknown[] };

/** Retire un membre des pages en cache de mes abonnés ou abonnements. */
function removeFromMyList(kind: ConnectionsKind, username: string): void {
  const me = myUsername();
  if (!me) return;
  queryClient.setQueriesData<MemberPages>(
    { queryKey: ['user', me, kind] },
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

/** Recharge mes abonnés ou abonnements (un membre y revient). */
function reloadMyList(kind: ConnectionsKind): void {
  const me = myUsername();
  if (me) void queryClient.invalidateQueries({ queryKey: ['user', me, kind] });
}

/** Après un changement d'abonnement : fil et blocs des fiches à recharger. */
function invalidateSocial(): void {
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === 'feed' || (queryKey[0] === 'title' && queryKey.at(-1) === 'social'),
  });
}

function failureMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) return FOLLOW_LIMIT;
  if (error instanceof ApiError && error.status === 403) return CANNOT_FOLLOW;
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

// ─── Suivre ────────────────────────────────────────────────────────────────

/** Suivre (immédiat), ou demander à suivre un profil privé. */
export function followMember(member: Member): void {
  if (!requireOnline()) return;
  const next = stateAfterFollow(member);
  hapticLight();
  if (next === 'pending') showToast(`Demande envoyée à @${member.username}`);
  let actual = next;
  void send({
    apply: () => {
      patchMemberEverywhere(member.username, { followState: next });
      if (next === 'following') countFollow(member.username, 1);
    },
    revert: () => {
      patchMemberEverywhere(member.username, { followState: member.followState });
      if (actual === 'following') countFollow(member.username, -1);
    },
    request: () =>
      api<{ status?: string }>(`/users/${member.username}/follow`, { method: 'POST' }).then(
        ({ status }) => {
          // Le serveur a le dernier mot (profil passé en privé entre-temps…).
          actual = status === 'pending' ? 'pending' : 'following';
          if (actual === next) return;
          patchMemberEverywhere(member.username, { followState: actual });
          countFollow(member.username, actual === 'following' ? 1 : -1);
        },
      ),
  });
}

/** Se désabonner : toast avec « Annuler », qui rétablit l'abonnement d'origine. */
export function unfollowMember(member: Member): void {
  if (!requireOnline()) return;
  const change: Change = {
    apply: () => {
      patchMemberEverywhere(member.username, { followState: 'none' });
      countFollow(member.username, -1);
    },
    revert: () => {
      patchMemberEverywhere(member.username, { followState: 'following' });
      countFollow(member.username, 1);
    },
    request: () => api(`/users/${member.username}/follow`, { method: 'DELETE' }),
  };
  void send(change).then((done) => {
    if (!done) return;
    showToast(`Tu ne suis plus @${member.username}`, () => {
      if (!requireOnline()) return;
      // Le serveur rétablit l'abonnement d'origine (mêmes dates), même sur un profil privé.
      void send(inverse(change, () => api(`/users/${member.username}/follow`, { method: 'POST' })));
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

/** Tap sur le bouton de suivi, selon son état (specs/social/docs/03 › FollowButton). */
export function pressFollow(member: Member): void {
  switch (member.followState) {
    case 'blocked':
      unblockMember(member);
      return;
    case 'pending':
      cancelRequest(member);
      return;
    case 'following':
      openActionSheet({
        title: `@${member.username}`,
        options: [
          { label: 'Se désabonner', icon: UserMinusIcon, onPress: () => unfollowMember(member) },
        ],
      });
      return;
    default:
      followMember(member);
  }
}

// ─── Abonnés ───────────────────────────────────────────────────────────────

/** Retirer un de mes abonnés, sans le prévenir ; « Annuler » le rétablit. */
export function removeFollower(member: Member): void {
  if (!requireOnline()) return;
  const me = myUsername();
  // Ma liste d'abonnés telle quelle, pour remettre la ligne à sa place.
  const lists = me
    ? queryClient.getQueriesData<MemberPages>({ queryKey: ['user', me, 'followers'] })
    : [];
  const change: Change = {
    apply: () => {
      patchMemberEverywhere(member.username, { followsMe: false });
      countFollower(member.username, -1);
      removeFromMyList('followers', member.username);
    },
    revert: () => {
      patchMemberEverywhere(member.username, { followsMe: true });
      countFollower(member.username, 1);
      for (const [key, data] of lists) queryClient.setQueryData(key, data);
      reloadMyList('followers');
    },
    request: () => api(`/me/followers/${member.username}`, { method: 'DELETE' }),
  };
  void send(change).then((done) => {
    if (!done) return;
    showToast(`@${member.username} ne te suit plus`, () => {
      if (!requireOnline()) return;
      void send(
        inverse(change, () => api(`/me/followers/${member.username}/restore`, { method: 'POST' })),
      );
    });
  });
}

// ─── Blocage et signalement ────────────────────────────────────────────────

/** Dialogue de confirmation, puis blocage (abonnements retirés dans les deux sens). */
export function blockMember(member: Member): void {
  if (!requireOnline()) return;
  openDialog({
    title: `Bloquer @${member.username} ?`,
    body: `Vous ne pourrez plus vous suivre et vous n'apparaîtrez plus dans vos recherches ni sur vos fiches. ${firstName(member.displayName)} ne sera pas prévenu·e.`,
    actions: [
      { label: 'Annuler', variant: 'secondary' },
      { label: 'Bloquer', variant: 'primary', onPress: () => confirmBlock(member) },
    ],
  });
}

function confirmBlock(member: Member): void {
  if (!requireOnline()) return;
  const following = member.followState === 'following';
  void send({
    apply: () => {
      patchMemberEverywhere(member.username, { followState: 'blocked', followsMe: false });
      if (following) countFollow(member.username, -1);
      if (member.followsMe) countFollower(member.username, -1);
      removeFromMyList('followers', member.username);
      removeFromMyList('following', member.username);
    },
    revert: () => {
      patchMemberEverywhere(member.username, {
        followState: member.followState,
        followsMe: member.followsMe,
      });
      if (following) countFollow(member.username, 1);
      if (member.followsMe) countFollower(member.username, 1);
      reloadMyList('followers');
      reloadMyList('following');
    },
    request: () => api(`/users/${member.username}/block`, { method: 'POST' }),
  }).then((done) => {
    if (done) showToast(`@${member.username} est bloqué·e`);
  });
}

/** Débloquer ne rétablit pas les anciens abonnements. */
export function unblockMember(member: Member): void {
  if (!requireOnline()) return;
  void send({
    apply: () => patchMemberEverywhere(member.username, { followState: 'none' }),
    revert: () => patchMemberEverywhere(member.username, { followState: 'blocked' }),
    request: () => api(`/users/${member.username}/block`, { method: 'DELETE' }),
  }).then((done) => {
    if (done) showToast(`@${member.username} est débloqué·e`);
  });
}

// ─── Demandes d'abonnement ─────────────────────────────────────────────────

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

/** Mon compteur de demandes (ligne et badge de Mon profil). */
function countRequests(delta: number): void {
  queryClient.setQueryData<Profile>(profileKey, (profile) =>
    profile
      ? { ...profile, followRequestsCount: Math.max(0, (profile.followRequestsCount ?? 0) + delta) }
      : profile,
  );
}

/** Accepter : la ligne disparaît, la personne me suit, toast « Léa te suit maintenant ». */
export function acceptRequest(member: Member): void {
  acceptRequests([member], `${firstName(member.displayName)} te suit maintenant`, (m) =>
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
        patchMemberEverywhere(member.username, { followsMe: true });
        countFollower(member.username, 1);
      }
    },
    revert: () => {
      putBack();
      countRequests(members.length);
      for (const member of members) {
        patchMemberEverywhere(member.username, { followsMe: false });
        countFollower(member.username, -1);
      }
    },
    request: () => request(members),
  }).then((done) => {
    if (!done) return;
    showToast(toast);
    reloadMyList('followers');
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
    },
    revert: () => {
      putBack();
      countRequests(1);
    },
    request: () => api(`/me/follow-requests/${member.username}/decline`, { method: 'POST' }),
  });
}

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
      ...(member.followsMe && member.followState !== 'blocked'
        ? [
            {
              label: 'Retirer de mes abonnés',
              icon: UserMinusIcon,
              onPress: () => removeFollower(member),
            },
          ]
        : []),
      member.followState === 'blocked'
        ? { label: 'Débloquer', icon: ProhibitIcon, onPress: () => unblockMember(member) }
        : { label: 'Bloquer', icon: ProhibitIcon, onPress: () => blockMember(member) },
      { label: 'Signaler', icon: FlagIcon, onPress: () => reportMember(member) },
    ],
  });
}
