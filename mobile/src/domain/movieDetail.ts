/** Fiche film : méta, bandeau de statut, Équipe et Infos — specs/docs/07 §7.1, docs/01 §5. */
import { movieState, type MovieAvailability, type MovieState } from './availability';
import { formatLongDate, formatRuntime, formatShortDate } from './format';

export type MovieMetaInput = { year?: number; runtime?: number; certification?: string };

/** « 2024 · 2 h 46 · 13+ », en omettant les valeurs absentes. */
export function movieMeta({ year, runtime, certification }: MovieMetaInput): string {
  return [year, runtime ? formatRuntime(runtime) : undefined, certification]
    .filter((part) => part !== undefined && part !== '')
    .join(' · ');
}

export type MovieStatus = { state: MovieState; digital: boolean; text: string };

export function movieStatus(
  movie: MovieAvailability & { releaseDigital?: string },
  now: Date,
): MovieStatus {
  const state = movieState(movie, now);
  switch (state) {
    case 'upcoming':
      return {
        state,
        digital: false,
        text: movie.releaseTheatrical
          ? `En salle le ${formatShortDate(movie.releaseTheatrical)}`
          : 'Pas encore de date',
      };
    case 'cinema':
      return { state, digital: false, text: 'Au cinéma maintenant' };
    case 'avail':
      return movie.releaseDigital
        ? {
            state,
            digital: true,
            text: `Disponible en numérique depuis le ${formatShortDate(movie.releaseDigital)}`,
          }
        : { state, digital: false, text: 'Disponible en streaming' };
    case 'unknown':
      return { state, digital: false, text: 'Pas encore de date' };
  }
}

export type InfoRow = {
  key: string;
  value: string;
  /** Personnes cliquables (fiche personne) ; `value` reste le texte de repli. */
  people?: { id: number; name: string }[];
};

function rows(entries: [string, string | undefined][]): InfoRow[] {
  return entries.flatMap(([key, value]) => (value ? [{ key, value }] : []));
}

export function movieCrew(
  directors: string[],
  writers: string[],
  directorIds: number[] = [],
): InfoRow[] {
  const people = directors.flatMap((name, index) =>
    directorIds[index] === undefined ? [] : [{ id: directorIds[index], name }],
  );
  const clickable = people.length === directors.length ? people : undefined;
  const director: InfoRow[] =
    directors.length > 0
      ? [{ key: 'Réalisation', value: directors.join(', '), people: clickable }]
      : [];
  return [...director, ...rows([['Scénario', writers.join(', ')]])];
}

export type MovieInfoInput = {
  originalTitle?: string;
  releaseTheatrical?: string;
  originalLanguage?: string;
  country?: string;
  studio?: string;
};

/** Lignes « Infos » ; `regionName` donne « Sortie (Canada) ». */
export function movieInfos(movie: MovieInfoInput, regionName: string): InfoRow[] {
  return rows([
    ['Titre original', movie.originalTitle],
    [
      `Sortie (${regionName})`,
      movie.releaseTheatrical ? formatLongDate(movie.releaseTheatrical) : undefined,
    ],
    ['Langue originale', movie.originalLanguage],
    ['Pays', movie.country],
    ['Studio', movie.studio],
  ]);
}
