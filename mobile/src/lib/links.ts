import * as WebBrowser from 'expo-web-browser';

import { config } from '@/api/config';
import { inviteLink } from '@/domain/social/links';

// Domaine des pages légales à définir (CLAUDE.md : liens universels).
export const TERMS_URL = 'https://zabava.app/conditions';
export const PRIVACY_URL = 'https://zabava.app/confidentialite';

export function openWebPage(url: string): void {
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}

/** Lien d'invitation d'un profil : https://{domaine}/u/{pseudo} (specs/social/docs/02 §4). */
export function profileLink(username: string): string {
  return inviteLink(config.inviteDomain, username);
}
