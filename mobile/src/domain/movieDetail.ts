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

/** Ligne de noms cliquables (fiche personne) quand chaque nom a son identifiant. */
export function personRow(key: string, names: string[], ids: number[]): InfoRow[] {
  if (names.length === 0) return [];
  const people = names.flatMap((name, index) =>
    ids[index] === undefined ? [] : [{ id: ids[index], name }],
  );
  return [
    { key, value: names.join(', '), people: people.length === names.length ? people : undefined },
  ];
}

export function movieCrew(movie: {
  directors: string[];
  directorIds?: number[];
  writers: string[];
  writerIds?: number[];
}): InfoRow[] {
  return [
    ...personRow('Réalisation', movie.directors, movie.directorIds ?? []),
    ...personRow('Scénario', movie.writers, movie.writerIds ?? []),
  ];
}

export type MovieInfoInput = {
  originalTitle?: string;
  releaseTheatrical?: string;
  originalLanguage?: string;
  country?: string;
  studio?: string;
};

/** Lignes « Infos ». */
export function movieInfos(movie: MovieInfoInput): InfoRow[] {
  return rows([
    ['Titre original', movie.originalTitle],
    ['Sortie', movie.releaseTheatrical ? formatLongDate(movie.releaseTheatrical) : undefined],
    ['Langue originale', movie.originalLanguage],
    ['Pays', movie.country],
    ['Studio', movie.studio],
  ]);
}
