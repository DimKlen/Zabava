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

import { type Member } from '@/domain/social/members';
import { hapticLight } from '@/lib/haptics';
import { profileLink } from '@/lib/links';
import { openActionSheet, showToast } from '@/store/ui';

import { ApiError, api } from './http';
import { profileKey, type Profile } from './profile';
import { queryClient } from './queryClient';
import { userKey, type Page, type UserProfile } from './social';

export const OFFLINE = 'Connexion requise';
export const SAVE_FAILED = "Impossible d'enregistrer, réessaie";
const FOLLOW_LIMIT = 'Tu as atteint la limite de 200 suivis par jour';

/** Requêtes où un membre peut apparaître (profils, listes, recherche, fil, fiches). */
const MEMBER_ROOTS = new Set(['user', 'members', 'recentProfiles', 'feed', 'title']);

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

/** Ajoute `delta` à mon compteur d'abonnements (profil en cache et fiche de mon profil). */
function countFollowing(delta: number): void {
  const me = myUsername();
  if (!me) return;
  queryClient.setQueryData<UserProfile>(userKey(me), (profile) =>
    profile ? { ...profile, friendsCount: Math.max(0, profile.friendsCount + delta) } : profile,
  );
  queryClient.setQueryData<Profile>(profileKey, (profile) =>
    profile
      ? { ...profile, friendsCount: Math.max(0, (profile.friendsCount ?? 0) + delta) }
      : profile,
  );
}

type MemberPages = { pages: Page<Member>[]; pageParams: unknown[] };

/** Retire un membre des pages en cache de mes abonnements. */
function removeFromMyFollowing(username: string): void {
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

/** Recharge mes abonnements : un membre y arrive ou y revient. */
function reloadMyFollowing(): void {
  const me = myUsername();
  if (me) void queryClient.invalidateQueries({ queryKey: ['user', me, 'friends'] });
}

/** Après un changement de suivi : fil et blocs des fiches à recharger. */
function invalidateSocial(): void {
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === 'feed' || (queryKey[0] === 'title' && queryKey.at(-1) === 'social'),
  });
}

/** Son profil et ses listes : visibles (ou non) dès que le suivi change. */
function refreshProfile(username: string): void {
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) => queryKey[0] === 'user' && queryKey[1] === username,
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

// ─── Suivi ─────────────────────────────────────────────────────────────────

/** « Suivre » : effectif tout de suite, toast avec « Annuler ». */
export function followMember(member: Member): void {
  if (!requireOnline()) return;
  hapticLight();
  const change: Change = {
    apply: () => {
      patchMemberEverywhere(member.username, { followState: 'following' });
      countFollowing(1);
    },
    revert: () => {
      patchMemberEverywhere(member.username, { followState: member.followState });
      countFollowing(-1);
    },
    request: () => api(`/users/${member.username}/follow`, { method: 'POST' }),
  };
  void send(change).then((done) => {
    if (!done) return;
    reloadMyFollowing();
    showToast(`Tu suis @${member.username}`, () => {
      if (!requireOnline()) return;
      void send(
        inverse(change, () => api(`/users/${member.username}/follow`, { method: 'DELETE' })),
      );
    });
  });
}

/** « Ne plus suivre » : toast avec « Annuler », qui rétablit le suivi d'origine. */
export function unfollowMember(member: Member): void {
  if (!requireOnline()) return;
  const me = myUsername();
  // Ma liste telle quelle, pour remettre la ligne à sa place.
  const lists = me
    ? queryClient.getQueriesData<MemberPages>({ queryKey: ['user', me, 'friends'] })
    : [];
  const change: Change = {
    apply: () => {
      patchMemberEverywhere(member.username, { followState: 'none' });
      countFollowing(-1);
      removeFromMyFollowing(member.username);
    },
    revert: () => {
      patchMemberEverywhere(member.username, { followState: 'following' });
      countFollowing(1);
      // Sans recharger : une relecture avant la fin de la restauration reviendrait sans lui.
      for (const [key, data] of lists) queryClient.setQueryData(key, data);
    },
    request: () => api(`/users/${member.username}/follow`, { method: 'DELETE' }),
  };
  void send(change).then((done) => {
    if (!done) return;
    refreshProfile(member.username);
    showToast(`Tu ne suis plus @${member.username}`, () => {
      if (!requireOnline()) return;
      // Le serveur rétablit le suivi d'origine (même date).
      void send(
        inverse(change, () =>
          api(`/users/${member.username}/follow`, { method: 'POST' }).then(() => {
            reloadMyFollowing();
            refreshProfile(member.username);
          }),
        ),
      );
    });
  });
}

/** Tap sur le bouton, selon son état (specs/social/docs/03 › FollowButton). */
export function pressFollow(member: Member): void {
  if (member.followState === 'following') {
    openActionSheet({
      title: `@${member.username}`,
      options: [
        { label: 'Ne plus suivre', icon: UserMinusIcon, onPress: () => unfollowMember(member) },
      ],
    });
    return;
  }
  followMember(member);
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
              label: 'Ne plus suivre',
              icon: UserMinusIcon,
              onPress: () => unfollowMember(member),
            },
          ]
        : []),
      { label: 'Signaler', icon: FlagIcon, onPress: () => reportMember(member) },
    ],
  });
}
