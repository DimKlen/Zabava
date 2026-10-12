/** Dates calendaires locales (fuseau du téléphone) — specs/docs/10 §5. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** « 2026-12-18 » → minuit local de ce jour (sans décalage UTC). */
export function parseLocalDate(iso: string): Date {
  const [year = 0, month = 1, day = 1] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Écart en jours calendaires entre aujourd'hui et une date ISO : 0 = aujourd'hui,
 * 1 = demain, −1 = hier. Arrondi pour absorber les changements d'heure.
 */
export function daysFromToday(iso: string, now: Date): number {
  return Math.round((parseLocalDate(iso).getTime() - startOfDay(now).getTime()) / DAY_MS);
}
