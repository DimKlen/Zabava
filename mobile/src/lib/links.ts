import * as WebBrowser from 'expo-web-browser';

// Domaine des pages légales à définir (CLAUDE.md : liens universels).
export const TERMS_URL = 'https://zabava.app/conditions';
export const PRIVACY_URL = 'https://zabava.app/confidentialite';

export function openWebPage(url: string): void {
  void WebBrowser.openBrowserAsync(url).catch(() => undefined);
}
