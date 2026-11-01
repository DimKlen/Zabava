/**
 * Membres, bouton « Suivre », compteur, visibilité — specs/social/docs/03 et docs/07 §1, revus pour
 * le suivi à sens unique et instantané (retours du 2026-11-01) : pas de demande, pas d'amis, on ne
 * sait pas qui nous suit.
 */

import { currentLanguage, t } from '@/i18n';

/** `following` : je le suis. */
export type FollowState = 'none' | 'following';

export type Member = {
  username: string;
  displayName: string;
  avatarUrl?: string;
  followState: FollowState;
  commonCount: number;
};

export type FollowButtonKind = 'follow' | 'following';

export type FollowButtonState = {
  kind: FollowButtonKind;
  label: string;
  icon: 'userPlus' | 'check';
  variant: 'primary' | 'secondary';
};

/** Bouton selon que je suis ou non le membre (specs/social/docs/03 › FollowButton). */
export function followButtonState({ followState }: Pick<Member, 'followState'>): FollowButtonState {
  return followState === 'following'
    ? {
        kind: 'following',
        label: t('social.follow.following'),
        icon: 'check',
        variant: 'secondary',
      }
    : { kind: 'follow', label: t('social.follow.follow'), icon: 'userPlus', variant: 'primary' };
}

/** Libellé d'accessibilité du bouton (specs/social/etapes/07 §2). */
export function followButtonA11y(kind: FollowButtonKind, username: string): string {
  return kind === 'following'
    ? t('social.follow.a11yFollowing', { username })
    : t('social.follow.a11yFollow', { username });
}

/** Nombre abrégé à partir de 10 000 : « 12,4 k ». */
export function formatCount(n: number): string {
  if (n < 10_000) return String(n);
  const thousands = Math.floor(n / 100) / 10;
  return `${thousands.toLocaleString(currentLanguage(), { maximumFractionDigits: 1 })} k`;
}

/** Libellé du compteur de personnes suivies : singulier pour 0 et 1. */
export function friendsLabel(n: number): string {
  return t(n > 1 ? 'social.count.following.other' : 'social.count.following.one');
}

/** « 12 titres en commun » (« Aucun titre en commun » pour 0, « 1 titre en commun »). */
export function commonLabel(n: number): string {
  if (n === 0) return t('social.common.none');
  return t(n === 1 ? 'social.common.one' : 'social.common.other', { count: n });
}

/** Chip, lignes de membres et recherche : affiché à partir de 3. */
export function showsCommon(n: number): boolean {
  return n >= 3;
}

/** Ce que je vois d'un profil : ses listes et ses abonnements seulement si je le suis. */
export function profileAccess(profile: { isMe: boolean; followState: FollowState }): {
  isMe: boolean;
  locked: boolean;
} {
  return { isMe: profile.isMe, locked: !profile.isMe && profile.followState !== 'following' };
}

/** Prénom = premier mot du nom affiché. */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}
