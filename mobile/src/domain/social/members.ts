/**
 * Membres, bouton de suivi, compteurs, visibilité — specs/social/docs/03 et docs/07 §1
 * (`A.fb`, `A.profVM` du prototype).
 */

/** Mon abonnement à ce membre, ou `blocked` si je l'ai bloqué. */
export type FollowState = 'none' | 'pending' | 'following' | 'blocked';

export type Member = {
  username: string;
  displayName: string;
  avatarUrl?: string;
  isPrivate: boolean;
  followState: FollowState;
  followsMe: boolean;
  commonCount: number;
};

export type FollowButtonKind = 'follow' | 'followBack' | 'requested' | 'following' | 'blocked';

export type FollowButtonState = {
  kind: FollowButtonKind;
  label: string;
  icon: 'userPlus' | 'clock' | 'check' | 'prohibit';
  variant: 'primary' | 'secondary';
};

/** blocked › following › pending › followsMe › none (specs/social/docs/03 › FollowButton). */
export function followButtonState({
  followState,
  followsMe,
}: Pick<Member, 'followState' | 'followsMe'>): FollowButtonState {
  switch (followState) {
    case 'blocked':
      return { kind: 'blocked', label: 'Débloquer', icon: 'prohibit', variant: 'secondary' };
    case 'following':
      return { kind: 'following', label: 'Abonné', icon: 'check', variant: 'secondary' };
    case 'pending':
      return { kind: 'requested', label: 'Demandé', icon: 'clock', variant: 'secondary' };
    default:
      return followsMe
        ? { kind: 'followBack', label: 'Suivre en retour', icon: 'userPlus', variant: 'primary' }
        : { kind: 'follow', label: 'Suivre', icon: 'userPlus', variant: 'primary' };
  }
}

/** Libellé d'accessibilité du bouton (specs/social/etapes/07 §2). */
export function followButtonA11y(kind: FollowButtonKind, username: string): string {
  switch (kind) {
    case 'following':
      return `Abonné à @${username}, toucher pour se désabonner`;
    case 'requested':
      return `Demande envoyée à @${username}, toucher pour l'annuler`;
    case 'blocked':
      return `Débloquer @${username}`;
    default:
      return `Suivre @${username}`;
  }
}

/** État après « Suivre » : demande si le profil est privé. */
export function stateAfterFollow(member: Pick<Member, 'isPrivate'>): FollowState {
  return member.isPrivate ? 'pending' : 'following';
}

/** Nombre abrégé à partir de 10 000 : « 12,4 k ». */
export function formatCount(n: number): string {
  if (n < 10_000) return String(n);
  const thousands = Math.floor(n / 100) / 10;
  return `${thousands.toLocaleString('fr-CA', { maximumFractionDigits: 1 })} k`;
}

/** Libellé d'un compteur : singulier pour 0 et 1. */
export function counterLabel(n: number, kind: 'followers' | 'following'): string {
  const singular = kind === 'followers' ? 'abonné' : 'abonnement';
  return n > 1 ? `${singular}s` : singular;
}

/** « 12 titres en commun » (« Aucun titre en commun » pour 0, « 1 titre en commun »). */
export function commonLabel(n: number): string {
  if (n === 0) return 'Aucun titre en commun';
  if (n === 1) return '1 titre en commun';
  return `${n} titres en commun`;
}

/** Chip, lignes de membres et recherche : affiché à partir de 3. */
export function showsCommon(n: number): boolean {
  return n >= 3;
}

/** Ce que je vois d'un profil (`A.profVM`). */
export function profileAccess(profile: {
  isMe: boolean;
  isPrivate: boolean;
  followState: FollowState;
}): { isMe: boolean; blocked: boolean; locked: boolean } {
  const blocked = !profile.isMe && profile.followState === 'blocked';
  const locked =
    !profile.isMe && !blocked && profile.isPrivate && profile.followState !== 'following';
  return { isMe: profile.isMe, blocked, locked };
}

/** Prénom = premier mot du nom affiché. */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}
