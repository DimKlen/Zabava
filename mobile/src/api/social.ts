/** API sociale — specs/social/docs/06 §3 et docs/07 §2. */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { episodeCode } from '@/domain/format';
import type { ActivityType, FeedActivity } from '@/domain/social/feed';
import type { TitleHolder, TitleSocial, TitleStatus } from '@/domain/social/followingSummary';
import type { FollowState, Member } from '@/domain/social/members';
import type { ProfileGridItem, ProfileSegment } from '@/domain/social/profileLists';
import { isWellFormedUsername } from '@/domain/social/username';
import type { MediaType } from '@/domain/types';

import { toPosterTitle } from './catalog';
import { api } from './http';
import { queryClient } from './queryClient';
import type { components } from './types';

type ApiMember = components['schemas']['MemberLite'];
type ApiUserProfile = components['schemas']['UserProfile'];
type ApiMemberPage = components['schemas']['PageMemberLite'];
type ApiTitlePage = components['schemas']['PageProfileTitle'];
type ApiActivity = components['schemas']['Activity'];
type ApiActivityPage = components['schemas']['PageActivity'];
type ApiTitleSocial = components['schemas']['TitleSocial'];
type ApiFollowingStatus = components['schemas']['FollowingStatus'];
export type UsernameAvailability = components['schemas']['UsernameAvailability'];

export type UserProfile = Member & {
  friendsCount: number;
  canSeeLists: boolean;
  isMe: boolean;
};

export type Page<T> = { items: T[]; nextCursor?: string };

const MINUTE = 60 * 1000;
const FOLLOW_STATES: ReadonlySet<string> = new Set(['none', 'pending', 'requested', 'following']);
const ACTIVITY_TYPES: ReadonlySet<string> = new Set([
  'added',
  'watched_movie',
  'started_show',
  'watched_episodes',
  'finished_show',
]);
const TITLE_STATUSES: ReadonlySet<string> = new Set([
  'watched',
  'towatch',
  'in_progress',
  'finished',
  'abandoned',
]);

// ─── Clés ──────────────────────────────────────────────────────────────────

export const usernameAvailableKey = (username: string) => ['usernameAvailable', username] as const;
export const userKey = (username: string) => ['user', username] as const;
export const userTitlesKey = (username: string, type: MediaType, status: ProfileSegment) =>
  ['user', username, 'titles', type, status] as const;
export const friendsKey = (username: string, q: string) =>
  ['user', username, 'friends', q] as const;

// ─── Conversions ───────────────────────────────────────────────────────────

export function toMember(item: ApiMember): Member | null {
  if (!item.username) return null;
  return {
    username: item.username,
    displayName: item.displayName || item.username,
    avatarUrl: item.avatarUrl,
    followState: FOLLOW_STATES.has(item.followState ?? '')
      ? (item.followState as FollowState)
      : 'none',
    followsMe: item.followsMe ?? false,
    commonCount: item.commonCount ?? 0,
  };
}

export function toUserProfile(item: ApiUserProfile): UserProfile | null {
  const member = toMember(item);
  if (!member) return null;
  return {
    ...member,
    friendsCount: item.friendsCount ?? 0,
    canSeeLists: item.canSeeLists ?? false,
    isMe: item.isMe ?? false,
  };
}

function toMemberPage(page: ApiMemberPage): Page<Member> {
  return {
    items: (page.items ?? []).map(toMember).filter((m): m is Member => m !== null),
    nextCursor: page.nextCursor,
  };
}

function toTitlePage(page: ApiTitlePage, type: MediaType): Page<ProfileGridItem> {
  const items: ProfileGridItem[] = [];
  for (const entry of page.items ?? []) {
    const title = entry.title ? toPosterTitle(entry.title, type) : null;
    if (!title) continue;
    const last = entry.lastEpisode;
    const progress =
      last?.season !== undefined && last.number !== undefined
        ? { code: episodeCode(last.season, last.number), pct: entry.progressPct ?? 0 }
        : undefined;
    items.push({ ...title, progress });
  }
  return { items, nextCursor: page.nextCursor };
}

/** Toutes les pages d'une liste infinie, à plat. */
export function flatItems<T>(pages: readonly Page<T>[] | undefined): T[] {
  return pages?.flatMap((page) => page.items) ?? [];
}

// ─── Pseudo ────────────────────────────────────────────────────────────────

export function checkUsername(
  username: string,
  signal?: AbortSignal,
): Promise<UsernameAvailability> {
  return api<UsernameAvailability>('/users/username-available', { query: { u: username }, signal });
}

/**
 * Disponibilité d'un pseudo bien formé, jamais mise en cache (staleTime 0) et sans nouvel essai :
 * hors ligne, l'échec s'affiche tout de suite (« Vérification impossible, réessaie »).
 */
export function useUsernameAvailability(username: string, enabled: boolean) {
  return useQuery({
    queryKey: usernameAvailableKey(username),
    queryFn: ({ signal }) => checkUsername(username, signal),
    enabled: enabled && isWellFormedUsername(username),
    staleTime: 0,
    retry: false,
  });
}

// ─── Profils ───────────────────────────────────────────────────────────────

export async function fetchUserProfile(
  username: string,
  signal?: AbortSignal,
): Promise<UserProfile> {
  const profile = toUserProfile(await api<ApiUserProfile>(`/users/${username}`, { signal }));
  if (!profile) throw new Error(`Profil invalide : ${username}`);
  return profile;
}

/** En-tête d'un profil (404 si introuvable ou s'il m'a bloqué). */
export function useUserProfile(username: string) {
  return useQuery({
    queryKey: userKey(username),
    queryFn: ({ signal }) => fetchUserProfile(username, signal),
    staleTime: 2 * MINUTE,
  });
}

/** Titres d'un autre profil, par 30 (403 si ce n'est pas un ami). */
export function useUserTitles(
  username: string,
  type: MediaType,
  status: ProfileSegment,
  enabled: boolean,
) {
  return useInfiniteQuery({
    queryKey: userTitlesKey(username, type, status),
    queryFn: ({ pageParam, signal }) =>
      api<ApiTitlePage>(`/users/${username}/titles`, {
        query: { type, status, cursor: pageParam },
        signal,
      }).then((page) => toTitlePage(page, type)),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
    enabled,
    staleTime: 5 * MINUTE,
  });
}

/** Amis d'un profil, plus récents d'abord, par 50 ; `q` filtre côté serveur. */
export function useFriends(username: string, q: string) {
  return useInfiniteQuery({
    queryKey: friendsKey(username, q),
    queryFn: ({ pageParam, signal }) =>
      api<ApiMemberPage>(`/users/${username}/friends`, {
        query: { q: q || undefined, cursor: pageParam },
        signal,
      }).then(toMemberPage),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 2 * MINUTE,
  });
}

/** Ouvrir un profil le met en tête des « Profils consultés récemment ». */
export function rememberVisit(username: string): Promise<void> {
  return api<ApiMember[]>(`/me/recent-profiles/${username}`, { method: 'POST' }).then((items) => {
    queryClient.setQueryData(
      recentProfilesKey,
      items.map(toMember).filter((m): m is Member => m !== null),
    );
  });
}

// ─── Recherche de membres ──────────────────────────────────────────────────

export const membersKey = (q: string) => ['members', q] as const;
export const recentProfilesKey = ['recentProfiles'] as const;

/** Membres par préfixe (pseudo, nom, mot du nom), à partir de 2 caractères, sans « @ ». */
export function useMemberSearch(q: string) {
  return useInfiniteQuery({
    queryKey: membersKey(q),
    queryFn: ({ pageParam, signal }) =>
      api<ApiMemberPage>('/users/search', { query: { q, cursor: pageParam }, signal }).then(
        toMemberPage,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
    enabled: q.length >= 2,
    staleTime: MINUTE,
  });
}

/** « Profils consultés récemment » : les 5 derniers profils visités. */
export function useRecentProfiles(enabled = true) {
  return useQuery({
    queryKey: recentProfilesKey,
    queryFn: ({ signal }) =>
      api<ApiMember[]>('/me/recent-profiles', { signal }).then((items) =>
        items.map(toMember).filter((m): m is Member => m !== null),
      ),
    enabled,
    staleTime: 10 * MINUTE,
  });
}

// ─── Fil d'activité ────────────────────────────────────────────────────────

export const feedKey = ['feed'] as const;

/** Activité du fil, ou null si elle est incomplète (type inconnu, titre ou personne absents). */
export function toActivity(item: ApiActivity): FeedActivity | null {
  const actor = item.actor ? toMember(item.actor) : null;
  if (!item.id || !item.createdAt || !actor || !ACTIVITY_TYPES.has(item.type ?? '')) return null;
  const type = item.type as ActivityType;
  const title = item.title ? toPosterTitle(item.title, 'movie') : null;
  if (!title) return null;
  const episode = item.episode;
  return {
    id: item.id,
    createdAt: item.createdAt,
    actor,
    type,
    title,
    episode:
      episode?.id !== undefined && episode.season !== undefined && episode.number !== undefined
        ? {
            id: episode.id,
            season: episode.season,
            number: episode.number,
            name: episode.name,
            stillPath: episode.stillPath,
          }
        : undefined,
    count: item.count ?? 1,
    inMyList: item.inMyList ?? false,
  };
}

function toActivityPage(page: ApiActivityPage): Page<FeedActivity> {
  return {
    items: (page.items ?? []).map(toActivity).filter((a): a is FeedActivity => a !== null),
    nextCursor: page.nextCursor,
  };
}

/** Activités de mes amis, plus récentes d'abord, par 30 ; 1re page gardée hors ligne. */
export function useFeed() {
  return useInfiniteQuery({
    queryKey: feedKey,
    queryFn: ({ pageParam, signal }) =>
      api<ApiActivityPage>('/me/feed', { query: { cursor: pageParam }, signal }).then(
        toActivityPage,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 2 * MINUTE,
  });
}

// ─── Blocs sociaux d'une fiche ─────────────────────────────────────────────

export const titleSocialKey = (type: MediaType, tmdbId: number) =>
  ['title', type, tmdbId, 'social'] as const;

function toHolder(item: ApiFollowingStatus): TitleHolder | null {
  const user = item.user ? toMember(item.user) : null;
  if (!user || !item.date) return null;
  return {
    user,
    status: TITLE_STATUSES.has(item.status ?? '') ? (item.status as TitleStatus) : 'towatch',
    detail: item.detail,
    date: item.date,
  };
}

export function toTitleSocial(data: ApiTitleSocial): TitleSocial {
  const holders = (items: ApiFollowingStatus[] | undefined) =>
    (items ?? []).map(toHolder).filter((h): h is TitleHolder => h !== null);
  return { following: holders(data.following) };
}

/** « Tes amis » d'une fiche, chargés en parallèle de la fiche. */
export function useTitleSocial(type: MediaType, tmdbId: number) {
  return useQuery({
    queryKey: titleSocialKey(type, tmdbId),
    queryFn: ({ signal }) =>
      api<ApiTitleSocial>(`/titles/${type}/${tmdbId}/social`, { signal }).then(toTitleSocial),
    staleTime: 10 * MINUTE,
  });
}

// ─── Demandes d'ami reçues ──────────────────────────────────────────────────

export const followRequestsKey = ['followRequests'] as const;

/** Mes demandes d'ami reçues, plus récentes d'abord, par 50. */
export function useFollowRequests() {
  return useInfiniteQuery({
    queryKey: followRequestsKey,
    queryFn: ({ pageParam, signal }) =>
      api<ApiMemberPage>('/me/follow-requests', { query: { cursor: pageParam }, signal }).then(
        toMemberPage,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: MINUTE,
  });
}
