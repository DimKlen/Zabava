/** Pseudos — specs/social/docs/01 §2 et docs/07 §1 (`clean`, `A.uCheck` du prototype). */

export const USERNAME_MAX = 20;
const FORMAT = /^[a-z0-9._]{3,20}$/;

/** admin, zabava, support et les noms de routes de l'app (même liste que le serveur). */
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  'admin',
  'zabava',
  'support',
  'login',
  'search',
  'title',
  'person',
  'genre',
  'settings',
  'onboarding',
  'discover',
  'upcoming',
  'profile',
  'watchlist',
  'feed',
  'me',
  'u',
  'studio',
  'scan',
  'auth',
  'dev',
]);

/** Sans accents ni casse (« Éloïse » → « eloise »). */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Saisie nettoyée en direct : minuscules, sans accents, `[a-z0-9._]` seulement, 20 caractères. */
export function cleanUsername(raw: string): string {
  return stripAccents(raw)
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, USERNAME_MAX);
}

/** Bon format (3 à 20 caractères permis). */
export function isWellFormedUsername(username: string): boolean {
  return FORMAT.test(username);
}

/** Bon format et pas réservé. */
export function isValidUsername(username: string): boolean {
  return isWellFormedUsername(username) && !RESERVED_USERNAMES.has(username);
}

/**
 * Proposition à partir du nom OAuth : prénom + « . » + initiale du nom (« Dim Kovac » → `dim.k`).
 * Trop court, on ajoute `.tv` (1re proposition de la spec) ; sans nom, `membre`.
 */
export function proposeUsername(displayName: string | null | undefined): string {
  const words = (displayName ?? '').trim().split(/\s+/).map(cleanUsername).filter(Boolean);
  const [head, ...rest] = words;
  if (head === undefined) return 'membre';
  const first = head.replace(/[._]+$/, '');
  const last = (rest.at(-1) ?? '').replace(/^[._]+/, '');
  const base = cleanUsername(last ? `${first}.${last.charAt(0)}` : first);
  if (base.length >= 3) return base;
  return cleanUsername(`${base || 'membre'}.tv`);
}

/** Délai entre la dernière frappe et la vérification. */
export const USERNAME_CHECK_MS = 300;

/** État du champ pseudo (specs/social/docs/03 › UsernameField). */
export type UsernameStatus = 'current' | 'checking' | 'available' | 'taken' | 'invalid' | 'offline';

type StatusInput = {
  value: string;
  /** Pseudo actuel (écran Modifier le profil, retour à l'étape pseudo). */
  current?: string | null;
  /** Valeur vérifiée (300 ms après la dernière frappe). */
  checked: string;
  loading: boolean;
  failed: boolean;
  result?: { available?: boolean; reason?: string };
};

/** Une réponse pour une ancienne valeur ne compte jamais : seule `checked === value` est lue. */
export function usernameStatus({
  value,
  current,
  checked,
  loading,
  failed,
  result,
}: StatusInput): UsernameStatus {
  if (current && value === current) return 'current';
  if (checked !== value) return 'checking';
  if (!isWellFormedUsername(value)) return 'invalid';
  if (loading) return 'checking';
  if (failed || !result) return 'offline';
  if (result.available) return 'available';
  return result.reason === 'invalid' ? 'invalid' : 'taken';
}

/** « Continuer » / « Enregistrer » : pseudo libre, ou pseudo actuel inchangé. */
export function canSubmitUsername(status: UsernameStatus): boolean {
  return status === 'available' || status === 'current';
}
