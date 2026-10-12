/**
 * Actions sur la liste (specs/docs/10 §4) : mise à jour optimiste du cache, toast
 * avec « Annuler » (qui restaure l'instantané et rejoue l'inverse), et retour à
 * l'instantané si le serveur refuse.
 */
import type { QueryKey } from '@tanstack/react-query';

import { initialStatus } from '@/domain/onboarding';
import type { Availability, MediaType, UserTitle } from '@/domain/types';
import type { LibraryMovie } from '@/domain/watchlist';
import { hapticLight } from '@/lib/haptics';
import { showToast, useUiStore } from '@/store/ui';

import { addTitle, patchTitle, removeTitle } from './library';
import { queryClient } from './queryClient';
import { titleKey, type TitleDetail } from './titles';
import { watchlistKey } from './watchlist';

/** Ce qu'il faut savoir d'un titre pour l'ajouter à la liste depuis n'importe quelle affiche. */
export type ListTitle = {
  id: string;
  tmdbId: number;
  type: MediaType;
  title: string;
  posterPath?: string;
  imdbRating?: number;
  releaseTheatrical?: string;
  availability?: Availability;
};

const SAVE_FAILED = "Impossible d'enregistrer, réessaie";

type Snapshot = [QueryKey, unknown][];

function snapshot(): Snapshot {
  return [
    ...queryClient.getQueriesData({ queryKey: ['watchlist'] }),
    ...queryClient.getQueriesData({ queryKey: ['title'] }),
  ];
}

function restore(saved: Snapshot): void {
  for (const [key, data] of saved) queryClient.setQueryData(key, data);
}

/** Statut actuel du titre, lu dans Ma liste puis dans sa fiche. */
export function currentUserTitle(title: ListTitle): UserTitle | undefined {
  const list = queryClient.getQueryData<LibraryMovie[]>(watchlistKey(title.type));
  const inList = list?.find((item) => item.id === title.id)?.userTitle;
  if (inList) return inList;
  return queryClient.getQueryData<TitleDetail>(titleKey(title.type, title.tmdbId))?.userTitle;
}

function toLibraryMovie(title: ListTitle, userTitle: UserTitle): LibraryMovie {
  return {
    id: title.id,
    tmdbId: title.tmdbId,
    title: title.title,
    posterPath: title.posterPath,
    imdbRating: title.imdbRating,
    releaseTheatrical: title.releaseTheatrical,
    availability: title.availability ?? { sub: [], rent: [], buy: [] },
    userTitle,
  };
}

/** Applique le nouveau statut à Ma liste et à la fiche, sans attendre le serveur. */
function applyUserTitle(title: ListTitle, userTitle: UserTitle | undefined): void {
  if (title.type === 'movie') {
    queryClient.setQueryData<LibraryMovie[]>(watchlistKey('movie'), (list) => {
      if (!list) return list;
      const others = list.filter((item) => item.id !== title.id);
      if (!userTitle) return others;
      const existing = list.find((item) => item.id === title.id);
      const updated = existing ? { ...existing, userTitle } : toLibraryMovie(title, userTitle);
      return existing
        ? list.map((item) => (item.id === title.id ? updated : item))
        : [updated, ...others];
    });
  }
  queryClient.setQueryData<TitleDetail>(titleKey(title.type, title.tmdbId), (detail) =>
    detail ? { ...detail, userTitle } : detail,
  );
}

/** Requête qui fait passer le serveur de `from` à `to`. */
async function sync(title: ListTitle, from: UserTitle | undefined, to: UserTitle | undefined) {
  if (!to) {
    if (from) await removeTitle(title.id, title.type);
    return;
  }
  if (!from) {
    await addTitle(title.tmdbId, title.type, to.status);
    return;
  }
  if (from.status !== to.status || from.notificationsEnabled !== to.notificationsEnabled) {
    await patchTitle(title.id, title.type, {
      status: from.status !== to.status ? to.status : undefined,
      notificationsEnabled:
        from.notificationsEnabled !== to.notificationsEnabled ? to.notificationsEnabled : undefined,
    });
  }
}

// Une file par titre : un ajout suivi d'un « Annuler » arrive au serveur dans l'ordre.
const queues = new Map<string, Promise<void>>();

function enqueue(id: string, request: () => Promise<void>): Promise<void> {
  const next = (queues.get(id) ?? Promise.resolve()).catch(() => undefined).then(request);
  queues.set(id, next);
  return next;
}

type Change = {
  title: ListTitle;
  next: UserTitle | undefined;
  /** Texte du toast ; sans texte, pas de toast. */
  message?: string;
  undoable: boolean;
};

function change({ title, next, message, undoable }: Change): void {
  const previous = currentUserTitle(title);
  const saved = snapshot();
  applyUserTitle(title, next);

  enqueue(title.id, () => sync(title, previous, next)).catch(() => {
    restore(saved);
    showToast(SAVE_FAILED);
  });

  if (!message) return;
  const undo = () => {
    restore(saved);
    enqueue(title.id, () => sync(title, next, previous)).catch(() => {
      void queryClient.invalidateQueries({ queryKey: watchlistKey(title.type) });
      showToast(SAVE_FAILED);
    });
  };
  showToast(message, undoable ? undo : undefined);
}

function newUserTitle(title: ListTitle, status: UserTitle['status'], base?: UserTitle): UserTitle {
  const now = new Date().toISOString();
  return {
    titleId: title.id,
    status,
    addedAt: base?.addedAt ?? now,
    watchedAt: status === 'watched' ? now : undefined,
    notificationsEnabled: base?.notificationsEnabled ?? true,
  };
}

/** « + » d'une affiche : ajoute (film → À voir, série → suivie) ou retire. */
export function toggleInList(title: ListTitle): void {
  if (currentUserTitle(title)) {
    removeFromList(title);
    return;
  }
  hapticLight();
  change({
    title,
    next: newUserTitle(title, initialStatus(title.type)),
    message: title.type === 'movie' ? 'Ajouté à ma liste' : 'Série suivie',
    undoable: true,
  });
}

export function removeFromList(title: ListTitle): void {
  change({ title, next: undefined, message: 'Retiré de ma liste', undoable: true });
}

/** Film vu / remis dans À voir. Un film hors liste marqué vu y entre directement en Vu. */
export function setMovieWatched(title: ListTitle, watched: boolean): void {
  if (watched) hapticLight();
  change({
    title,
    next: newUserTitle(title, watched ? 'watched' : 'towatch', currentUserTitle(title)),
    message: watched ? 'Marqué comme vu' : 'Remis dans À voir',
    undoable: true,
  });
}

/** Cloche d'une fiche : bascule les alertes du titre (toast sans « Annuler »). */
export function setTitleAlerts(title: ListTitle, enabled: boolean): void {
  const current = currentUserTitle(title);
  const message = enabled ? 'Alertes activées pour ce titre' : 'Alertes coupées pour ce titre';
  if (!current) {
    // Hors liste : préférence locale, reprise si le titre est ajouté ensuite.
    useUiStore.getState().setAlertsOff(title.id, !enabled);
    showToast(message);
    return;
  }
  change({
    title,
    next: { ...current, notificationsEnabled: enabled },
    message,
    undoable: false,
  });
}
