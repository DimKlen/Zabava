/**
 * Blocs sociaux d'une fiche : « Tes abonnements » et « Ils l'ont vu » — specs/social/docs/03
 * (FollowingCard, FollowingSheet, SawCard), docs/04 §4.9 (`A.titleSoc`, `A.socStatus`).
 */
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

export type TitleSocial = { following: TitleHolder[]; saw: TitleHolder[] };

/** « Ils l'ont vu » n'apparaît qu'à partir de 3 profils. */
export const MIN_SAW = 3;
/** Avatars empilés de la carte « Tes abonnements ». */
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
      return `${a} et ${b}`;
    case 3:
      return `${a}, ${b} et ${c}`;
    default:
      return `${a}, ${b} et ${firstNames.length - 2} autres`;
  }
}

/** Ligne de la sheet : « Vu le 12 oct. », « En cours · S02 E05 », « Terminée »… */
export function followingStatus(holder: TitleHolder, type: MediaType): string {
  if (type === 'movie') {
    return holder.status === 'watched'
      ? `Vu le ${formatShortDate(new Date(holder.date))}`
      : 'Dans sa liste';
  }
  switch (holder.status) {
    case 'in_progress':
      return holder.detail ? `En cours · ${holder.detail}` : 'En cours';
    case 'finished':
      return 'Terminée';
    case 'abandoned':
      return 'Abandonnée';
    default:
      return 'Dans sa liste';
  }
}

/**
 * Ce qu'affichent les blocs, d'après l'état de suivi en cache : quelqu'un que je viens de suivre
 * depuis « Ils l'ont vu » passe aussitôt dans « Tes abonnements » ; un abonnement que je viens de
 * quitter (ou bloquer) en sort.
 */
export function titleSocialView(data: TitleSocial): {
  following: TitleHolder[];
  saw: TitleHolder[];
  showsSaw: boolean;
} {
  const followed = data.saw.filter(({ user }) => user.followState === 'following');
  const following = [
    ...data.following.filter(({ user }) => user.followState === 'following'),
    ...followed,
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  // Bloqué ou demande en attente : ni dans l'un ni dans l'autre.
  const saw = data.saw.filter(({ user }) => user.followState === 'none');
  return { following, saw, showsSaw: saw.length >= MIN_SAW };
}

/** Prénoms de la carte, dans l'ordre de la liste. */
export function followingNames(holders: readonly TitleHolder[]): string[] {
  return holders.map(({ user }) => firstName(user.displayName));
}
