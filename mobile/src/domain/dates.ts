/** Dates calendaires locales (fuseau du téléphone) — specs/docs/10 §5. */

const DAY_MS = 24 * 60 * 60 * 1000;

/** « 2026-12-18 » → minuit local de ce jour (sans décalage UTC). */
export function parseLocalDate(iso: string): Date {
  const [year = 0, month = 1, day = 1] = iso.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Écart en jours calendaires locaux entre `now` et `date` : 0 = même jour,
 * 1 = lendemain, −1 = veille. Arrondi pour absorber les changements d'heure.
 */
export function calendarDaysBetween(now: Date, date: Date): number {
  return Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
}

/** Écart en jours calendaires entre aujourd'hui et une date ISO (« 2026-12-18 »). */
export function daysFromToday(iso: string, now: Date): number {
  return calendarDaysBetween(now, parseLocalDate(iso));
}
