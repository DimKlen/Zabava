/**
 * Membres, bouton d'ami, compteur, visibilité — specs/social/docs/03 et docs/07 §1, revus pour les
 * amis réciproques (retours du 2026-10-24) : une demande, acceptée, rend amis dans les deux sens.
 */

/**
 * `following` : amis ; `pending` : ma demande envoyée ; `requested` : sa demande reçue ;
 * `blocked` : je l'ai bloqué.
 */
export type FollowState = 'none' | 'pending' | 'requested' | 'following' | 'blocked';

export type Member = {
  username: string;
  displayName: string;
  avatarUrl?: string;
  followState: FollowState;
  followsMe: boolean;
  commonCount: number;
};

export type FollowButtonKind = 'add' | 'accept' | 'requested' | 'friends' | 'blocked';

export type FollowButtonState = {
  kind: FollowButtonKind;
  label: string;
  icon: 'userPlus' | 'clock' | 'check' | 'prohibit';
  variant: 'primary' | 'secondary';
};

/** Bouton d'ami selon la relation (specs/social/docs/03 › FollowButton, revu pour les amis). */
export function followButtonState({ followState }: Pick<Member, 'followState'>): FollowButtonState {
  switch (followState) {
    case 'blocked':
      return { kind: 'blocked', label: 'Débloquer', icon: 'prohibit', variant: 'secondary' };
    case 'following':
      return { kind: 'friends', label: 'Amis', icon: 'check', variant: 'secondary' };
    case 'pending':
      return { kind: 'requested', label: 'Demande envoyée', icon: 'clock', variant: 'secondary' };
    case 'requested':
      return { kind: 'accept', label: 'Accepter', icon: 'userPlus', variant: 'primary' };
    default:
      return { kind: 'add', label: 'Ajouter en ami', icon: 'userPlus', variant: 'primary' };
  }
}

/** Libellé d'accessibilité du bouton (specs/social/etapes/07 §2). */
export function followButtonA11y(kind: FollowButtonKind, username: string): string {
  switch (kind) {
    case 'friends':
      return `Ami avec @${username}, toucher pour le retirer`;
    case 'requested':
      return `Demande envoyée à @${username}, toucher pour l'annuler`;
    case 'accept':
      return `Accepter la demande de @${username}`;
    case 'blocked':
      return `Débloquer @${username}`;
    default:
      return `Ajouter @${username} en ami`;
  }
}

/** État après « Ajouter en ami » : amis s'il m'avait déjà envoyé une demande, sinon demande. */
export function stateAfterFollow(member: Pick<Member, 'followState'>): FollowState {
  return member.followState === 'requested' ? 'following' : 'pending';
}

/** Nombre abrégé à partir de 10 000 : « 12,4 k ». */
export function formatCount(n: number): string {
  if (n < 10_000) return String(n);
  const thousands = Math.floor(n / 100) / 10;
  return `${thousands.toLocaleString('fr-CA', { maximumFractionDigits: 1 })} k`;
}

/** Libellé du compteur d'amis : singulier pour 0 et 1. */
export function friendsLabel(n: number): string {
  return n > 1 ? 'amis' : 'ami';
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

/** Ce que je vois d'un profil : ses listes et ses amis seulement si nous sommes amis. */
export function profileAccess(profile: { isMe: boolean; followState: FollowState }): {
  isMe: boolean;
  blocked: boolean;
  locked: boolean;
} {
  const blocked = !profile.isMe && profile.followState === 'blocked';
  const locked = !profile.isMe && !blocked && profile.followState !== 'following';
  return { isMe: profile.isMe, blocked, locked };
}

/** Prénom = premier mot du nom affiché. */
export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}
