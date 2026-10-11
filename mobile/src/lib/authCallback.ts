export type AuthCallback = { code?: string; error?: string };

/**
 * Lit le code PKCE (ou l'erreur) du lien de retour OAuth de Supabase,
 * dans la requête (`?code=…`) ou le fragment (`#error=…`).
 */
export function parseAuthCallback(url: string): AuthCallback {
  const params: Record<string, string> = {};
  const queryStart = url.indexOf('?');
  const hashStart = url.indexOf('#');
  const parts = [
    queryStart >= 0
      ? url.slice(queryStart + 1, hashStart > queryStart ? hashStart : undefined)
      : '',
    hashStart >= 0 ? url.slice(hashStart + 1) : '',
  ];
  for (const part of parts) {
    for (const pair of part.split('&')) {
      if (!pair) continue;
      const [key = '', value = ''] = pair.split('=');
      params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
    }
  }
  return { code: params.code || undefined, error: params.error || undefined };
}
