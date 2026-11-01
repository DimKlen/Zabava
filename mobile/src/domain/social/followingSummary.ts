/**
 * Bloc social d'une fiche : « Tes amis » — specs/social/docs/03 (FollowingCard, FollowingSheet),
 * docs/04 §4.9, sans « Ils l'ont vu » depuis les amis réciproques (seuls mes amis sont visibles).
 */
import { t } from '@/i18n';

import { formatShortDate } from '../format';
import type { MediaType } from '../types';

import { firstName, type Member } from './members';

/** Statut d'un membre sur le titre (`GET /titles/…/social`). */
export type TitleStatus = 'watched' | 'towatch' | 'in_progress' | 'finished' | 'abandoned';

export type TitleHolder = {
  user: Member;
  status: TitleStatus;
  /** Série en cours : dernier épisode vu, « S02 E05 ». */
  detail?: string;
  /** Film vu : date de visionnage ; sinon dernière action sur le titre (ISO). */
  date: string;
};

export type TitleSocial = { following: TitleHolder[] };

/** Avatars empilés de la carte « Tes amis ». */
export const STACK_MAX = 5;

/** 1 « Léa » · 2 « Léa et Max » · 3 « Léa, Max et Sarah » · ≥ 4 « Léa, Max et 5 autres ». */
export function followingText(firstNames: readonly string[]): string {
  const [a = '', b = '', c = ''] = firstNames;
  switch (firstNames.length) {
    case 0:
      return '';
    case 1:
      return a;
    case 2:
      return t('social.following.two', { a, b });
    case 3:
      return t('social.following.three', { a, b, c });
    default:
      return t('social.following.many', { a, b, count: firstNames.length - 2 });
  }
}

/** Ligne de la sheet : « Vu le 12 oct. », « En cours · S02 E05 », « Terminée »… */
export function followingStatus(holder: TitleHolder, type: MediaType): string {
  if (type === 'movie') {
    return holder.status === 'watched'
      ? t('social.status.watchedOn', { date: formatShortDate(new Date(holder.date)) })
      : t('social.status.inList');
  }
  switch (holder.status) {
    case 'in_progress':
      return holder.detail
        ? t('social.status.inProgressWith', { detail: holder.detail })
        : t('social.status.inProgress');
    case 'finished':
      return t('social.status.finished');
    case 'abandoned':
      return t('social.status.abandoned');
    default:
      return t('social.status.inList');
  }
}

/** Mes amis sur ce titre, d'après le cache : un ami que je viens de retirer en sort. */
export function friendsOnTitle(data: TitleSocial): TitleHolder[] {
  return data.following.filter(({ user }) => user.followState === 'following');
}

/** Prénoms de la carte, dans l'ordre de la liste. */
export function followingNames(holders: readonly TitleHolder[]): string[] {
  return holders.map(({ user }) => firstName(user.displayName));
}
