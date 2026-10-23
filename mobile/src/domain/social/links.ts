/** Liens de profil (specs/social/docs/02 §4, docs/07 §5) : invitation, QR, liens profonds. */
import { isWellFormedUsername } from './username';

/** Lien d'invitation : https://{domaine}/u/{pseudo}. */
export function inviteLink(domain: string, username: string): string {
  return `https://${domain}/u/${username}`;
}

/** Texte prérempli de « Partager mon lien ». */
export function inviteMessage(domain: string, username: string): string {
  return `Suis-moi sur Zabava : ${inviteLink(domain, username)}`;
}

/**
 * Pseudo d'un code scanné ou d'un lien : seulement `https://{domaine}/u/{pseudo}` ou
 * `{schéma}://u/{pseudo}`, avec un pseudo au bon format ; sinon null.
 */
export function usernameFromLink(raw: string, domain: string, scheme: string): string | null {
  const text = raw.trim();
  const web = text.match(/^https:\/\/([^/?#]+)\/u\/([^/?#]+)\/?(?:[?#].*)?$/i);
  const app = text.match(/^([a-z][a-z0-9+.-]*):\/\/u\/([^/?#]+)\/?(?:[?#].*)?$/i);
  let candidate: string | undefined;
  if (web && web[1]?.toLowerCase() === domain.toLowerCase()) candidate = web[2];
  else if (app && app[1]?.toLowerCase() === scheme.toLowerCase()) candidate = app[2];
  if (!candidate) return null;
  let username: string;
  try {
    username = decodeURIComponent(candidate).toLowerCase();
  } catch {
    return null;
  }
  return isWellFormedUsername(username) ? username : null;
}

/** Chemin d'un profil dans l'app, pour un lien profond gardé en attente de connexion. */
export function profilePath(username: string): string {
  return `/u/${username}`;
}

/** Le chemin ouvert est-il un profil (lien à garder si l'utilisateur n'est pas connecté) ? */
export function isProfilePath(path: string): boolean {
  return /^\/u\/[a-z0-9._]{3,20}\/?$/.test(path);
}
