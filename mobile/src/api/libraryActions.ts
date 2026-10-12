/**
 * Actions sur la liste (specs/docs/10 §4) : mise à jour optimiste du cache, toast
 * avec « Annuler » (qui restaure l'état d'avant du titre et rejoue l'inverse), et
 * retour à cet état si le serveur refuse.
 */
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

/** État d'un seul titre dans le cache, pour Annuler sans toucher aux autres titres. */
type TitleSnapshot = {
  listEntry?: LibraryMovie;
  listIndex: number;
  detailUserTitle?: UserTitle;
};

function movieList(): LibraryMovie[] | undefined {
  return queryClient.getQueryData<LibraryMovie[]>(watchlistKey('movie'));
}

function snapshotTitle(title: ListTitle): TitleSnapshot {
  const list = title.type === 'movie' ? movieList() : undefined;
  const listIndex = list?.findIndex((item) => item.id === title.id) ?? -1;
  return {
    listEntry: listIndex >= 0 ? list?.[listIndex] : undefined,
    listIndex,
    detailUserTitle: queryClient.getQueryData<TitleDetail>(titleKey(title.type, title.tmdbId))
      ?.userTitle,
  };
}

function snapshotUserTitle(snapshot: TitleSnapshot): UserTitle | undefined {
  return snapshot.listEntry?.userTitle ?? snapshot.detailUserTitle;
}

/** Statut actuel du titre, lu dans Ma liste puis dans sa fiche. */
export function currentUserTitle(title: ListTitle): UserTitle | undefined {
  return snapshotUserTitle(snapshotTitle(title));
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

function setDetailUserTitle(title: ListTitle, userTitle: UserTitle | undefined): void {
  queryClient.setQueryData<TitleDetail>(titleKey(title.type, title.tmdbId), (detail) =>
    detail ? { ...detail, userTitle } : detail,
  );
}

/** Applique le nouveau statut à Ma liste et à la fiche, sans attendre le serveur. */
function applyUserTitle(title: ListTitle, userTitle: UserTitle | undefined): void {
  if (title.type === 'movie') {
    queryClient.setQueryData<LibraryMovie[]>(watchlistKey('movie'), (list) => {
      if (!list) return list;
      if (!userTitle) return list.filter((item) => item.id !== title.id);
      const existing = list.find((item) => item.id === title.id);
      if (existing) {
        return list.map((item) => (item.id === title.id ? { ...item, userTitle } : item));
      }
      return [toLibraryMovie(title, userTitle), ...list];
    });
  }
  setDetailUserTitle(title, userTitle);
}

/** Remet le titre tel qu'il était (même place dans Ma liste), sans toucher aux autres. */
function restoreTitle(title: ListTitle, snapshot: TitleSnapshot): void {
  if (title.type === 'movie') {
    queryClient.setQueryData<LibraryMovie[]>(watchlistKey('movie'), (list) => {
      if (!list) return list;
      const others = list.filter((item) => item.id !== title.id);
      if (!snapshot.listEntry) return others;
      const index = Math.min(Math.max(snapshot.listIndex, 0), others.length);
      return [...others.slice(0, index), snapshot.listEntry, ...others.slice(index)];
    });
  }
  setDetailUserTitle(title, snapshot.detailUserTitle);
}

/** Requêtes qui font passer le serveur de `from` à `to`. */
async function sync(title: ListTitle, from: UserTitle | undefined, to: UserTitle | undefined) {
  if (!to) {
    if (from) await removeTitle(title.id);
    return;
  }
  if (!from) {
    await addTitle(title.tmdbId, title.type, to.status);
    // L'ajout active les alertes côté serveur : on reporte un choix contraire.
    if (!to.notificationsEnabled) {
      await patchTitle(title.id, { notificationsEnabled: false });
    }
    return;
  }
  const status = from.status !== to.status ? to.status : undefined;
  const notificationsEnabled =
    from.notificationsEnabled !== to.notificationsEnabled ? to.notificationsEnabled : undefined;
  if (status !== undefined || notificationsEnabled !== undefined) {
    await patchTitle(title.id, { status, notificationsEnabled });
  }
}

// Une file par titre : un ajout suivi d'un « Annuler » arrive au serveur dans l'ordre.
const queues = new Map<string, Promise<void>>();
// Requêtes en cours par type : Ma liste n'est rechargée qu'une fois toutes terminées,
// pour qu'un rechargement n'écrase pas une action pas encore envoyée.
const pending = new Map<MediaType, number>();

function enqueue(title: ListTitle, request: () => Promise<void>): Promise<void> {
  const next = (queues.get(title.id) ?? Promise.resolve()).catch(() => undefined).then(request);
  queues.set(title.id, next);
  pending.set(title.type, (pending.get(title.type) ?? 0) + 1);

  const settle = () => {
    if (queues.get(title.id) === next) queues.delete(title.id);
    const left = (pending.get(title.type) ?? 1) - 1;
    pending.set(title.type, left);
    if (left === 0) void queryClient.invalidateQueries({ queryKey: watchlistKey(title.type) });
  };
  next.then(settle, settle);
  return next;
}

/** Interrompt un rechargement en cours : à sa fin, il écraserait la mise à jour optimiste. */
function cancelRefetch(title: ListTitle): Promise<void> {
  return queryClient.cancelQueries({ queryKey: watchlistKey(title.type) });
}

type Change = {
  title: ListTitle;
  next: UserTitle | undefined;
  message: string;
  undoable: boolean;
};

function change({ title, next, message, undoable }: Change): void {
  const applied = cancelRefetch(title).then(() => {
    const saved = snapshotTitle(title);
    applyUserTitle(title, next);
    return saved;
  });

  void applied.then((saved) =>
    enqueue(title, () => sync(title, snapshotUserTitle(saved), next)).catch(() => {
      restoreTitle(title, saved);
      showToast(SAVE_FAILED);
    }),
  );

  const undo = () =>
    void applied.then(async (saved) => {
      await cancelRefetch(title);
      restoreTitle(title, saved);
      enqueue(title, () => sync(title, next, snapshotUserTitle(saved))).catch(() => {
        void queryClient.invalidateQueries({ queryKey: watchlistKey(title.type) });
        showToast(SAVE_FAILED);
      });
    });

  showToast(message, undoable ? undo : undefined);
}

function newUserTitle(title: ListTitle, status: UserTitle['status'], base?: UserTitle): UserTitle {
  const now = new Date().toISOString();
  return {
    titleId: title.id,
    status,
    addedAt: base?.addedAt ?? now,
    watchedAt: status === 'watched' ? now : undefined,
    // Hors liste, la cloche a pu être coupée : le choix est repris à l'ajout.
    notificationsEnabled:
      base?.notificationsEnabled ?? !(useUiStore.getState().alertsOff[title.id] ?? false),
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
