/** API sociale — specs/social/docs/06 §3 et docs/07 §2. */
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { episodeCode } from '@/domain/format';
import type { FollowState, Member } from '@/domain/social/members';
import type { ProfileGridItem, ProfileSegment } from '@/domain/social/profileLists';
import { isWellFormedUsername } from '@/domain/social/username';
import type { MediaType } from '@/domain/types';

import { toPosterTitle } from './catalog';
import { api } from './http';
import type { components } from './types';

type ApiMember = components['schemas']['MemberLite'];
type ApiUserProfile = components['schemas']['UserProfile'];
type ApiMemberPage = components['schemas']['PageMemberLite'];
type ApiTitlePage = components['schemas']['PageProfileTitle'];
export type UsernameAvailability = components['schemas']['UsernameAvailability'];

export type UserProfile = Member & {
  followersCount: number;
  followingCount: number;
  canSeeLists: boolean;
  isMe: boolean;
};

export type Page<T> = { items: T[]; nextCursor?: string };

export type ConnectionsKind = 'followers' | 'following';

const MINUTE = 60 * 1000;
const FOLLOW_STATES: ReadonlySet<string> = new Set(['none', 'pending', 'following', 'blocked']);

// ─── Clés ──────────────────────────────────────────────────────────────────

export const usernameAvailableKey = (username: string) => ['usernameAvailable', username] as const;
export const userKey = (username: string) => ['user', username] as const;
export const userTitlesKey = (username: string, type: MediaType, status: ProfileSegment) =>
  ['user', username, 'titles', type, status] as const;
export const connectionsKey = (username: string, kind: ConnectionsKind, q: string) =>
  ['user', username, kind, q] as const;

// ─── Conversions ───────────────────────────────────────────────────────────

export function toMember(item: ApiMember): Member | null {
  if (!item.username) return null;
  return {
    username: item.username,
    displayName: item.displayName || item.username,
    avatarUrl: item.avatarUrl,
    isPrivate: item.isPrivate ?? false,
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
    followersCount: item.followersCount ?? 0,
    followingCount: item.followingCount ?? 0,
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

/** Titres d'un autre profil, par 30 (403 si privé non suivi). */
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

/** Abonnés ou abonnements, plus récents d'abord, par 50 ; `q` filtre côté serveur. */
export function useConnections(username: string, kind: ConnectionsKind, q: string) {
  return useInfiniteQuery({
    queryKey: connectionsKey(username, kind, q),
    queryFn: ({ pageParam, signal }) =>
      api<ApiMemberPage>(`/users/${username}/${kind}`, {
        query: { q: q || undefined, cursor: pageParam },
        signal,
      }).then(toMemberPage),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 2 * MINUTE,
  });
}

/** Ouvrir un profil le met en tête des « Personnes suivies récemment ». */
export function rememberVisit(username: string): Promise<void> {
  return api<unknown>(`/me/recent-profiles/${username}`, { method: 'POST' }).then(() => undefined);
}
