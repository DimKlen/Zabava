/**
 * Actions sur la liste (specs/docs/10 §4) : mise à jour optimiste du cache, toast
 * avec « Annuler » (qui restaure l'état d'avant du titre et rejoue l'inverse), et
 * retour à cet état si le serveur refuse.
 */
import { initialStatus } from '@/domain/onboarding';
import type { SeriesEpisode } from '@/domain/series';
import type { LibrarySeries } from '@/domain/seriesList';
import type { Availability, MediaType, UserTitle } from '@/domain/types';
import type { LibraryMovie } from '@/domain/watchlist';
import { hapticLight } from '@/lib/haptics';
import { showToast, useUiStore } from '@/store/ui';

import { episodesKey } from './episodes';
import { addTitle, markEpisodes, patchTitle, removeTitle, unmarkEpisodes } from './library';
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
  /** Séries : chaîne d'origine (badge) et fin de production (section Terminées). */
  network?: string;
  ended?: boolean;
};

type ListEntry = LibraryMovie | LibrarySeries;

const SAVE_FAILED = "Impossible d'enregistrer, réessaie";
const EMPTY_AVAILABILITY: Availability = { sub: [], rent: [], buy: [] };

// ─── Cache ─────────────────────────────────────────────────────────────────

const isSeries = (type: MediaType): type is 'tv' | 'anime' => type !== 'movie';

function listOf(type: MediaType): ListEntry[] | undefined {
  return queryClient.getQueryData<ListEntry[]>(watchlistKey(type));
}

function cachedEpisodes(title: ListTitle): SeriesEpisode[] | undefined {
  return isSeries(title.type)
    ? queryClient.getQueryData<SeriesEpisode[]>(episodesKey(title.type, title.tmdbId))
    : undefined;
}

/** État d'un seul titre dans le cache, pour Annuler sans toucher aux autres titres. */
type TitleSnapshot = {
  listEntry?: ListEntry;
  listIndex: number;
  detailUserTitle?: UserTitle;
};

function snapshotTitle(title: ListTitle): TitleSnapshot {
  const list = listOf(title.type);
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

function toListEntry(title: ListTitle, userTitle: UserTitle): ListEntry {
  const common = {
    id: title.id,
    tmdbId: title.tmdbId,
    title: title.title,
    posterPath: title.posterPath,
    availability: title.availability ?? EMPTY_AVAILABILITY,
    userTitle,
  };
  if (!isSeries(title.type)) {
    return { ...common, imdbRating: title.imdbRating, releaseTheatrical: title.releaseTheatrical };
  }
  return {
    ...common,
    type: title.type,
    network: title.network,
    ended: title.ended,
    episodes: cachedEpisodes(title) ?? [],
  };
}

function setDetailUserTitle(title: ListTitle, userTitle: UserTitle | undefined): void {
  queryClient.setQueryData<TitleDetail>(titleKey(title.type, title.tmdbId), (detail) =>
    detail ? { ...detail, userTitle } : detail,
  );
}

/** Applique le nouveau statut à Ma liste et à la fiche, sans attendre le serveur. */
function applyUserTitle(title: ListTitle, userTitle: UserTitle | undefined): void {
  queryClient.setQueryData<ListEntry[]>(watchlistKey(title.type), (list) => {
    if (!list) return list;
    if (!userTitle) return list.filter((item) => item.id !== title.id);
    const existing = list.find((item) => item.id === title.id);
    if (existing) {
      return list.map((item) => (item.id === title.id ? { ...item, userTitle } : item));
    }
    return [toListEntry(title, userTitle), ...list];
  });
  setDetailUserTitle(title, userTitle);
}

/** Remet le titre tel qu'il était (même place dans Ma liste), sans toucher aux autres. */
function restoreTitle(title: ListTitle, snapshot: TitleSnapshot): void {
  queryClient.setQueryData<ListEntry[]>(watchlistKey(title.type), (list) => {
    if (!list) return list;
    const others = list.filter((item) => item.id !== title.id);
    if (!snapshot.listEntry) return others;
    const index = Math.min(Math.max(snapshot.listIndex, 0), others.length);
    return [...others.slice(0, index), snapshot.listEntry, ...others.slice(index)];
  });
  setDetailUserTitle(title, snapshot.detailUserTitle);
}

/** watchedAt par id d'épisode (undefined = non vu). */
type EpisodeStates = Map<number, string | undefined>;

/** Épisodes connus du titre : Ma liste et fiche réunies, par id. */
function knownEpisodes(title: ListTitle): Map<number, SeriesEpisode> {
  const byId = new Map<number, SeriesEpisode>();
  const entry = listOf(title.type)?.find((item) => item.id === title.id);
  const fromList = entry && 'episodes' in entry ? entry.episodes : [];
  for (const episode of [...fromList, ...(cachedEpisodes(title) ?? [])]) {
    byId.set(episode.id, episode);
  }
  return byId;
}

/** Applique des états d'épisodes à Ma liste et à la fiche. */
function applyEpisodes(title: ListTitle, states: EpisodeStates): void {
  if (!isSeries(title.type) || states.size === 0) return;
  const patch = (episodes: SeriesEpisode[]) =>
    episodes.map((episode) =>
      states.has(episode.id) ? { ...episode, watchedAt: states.get(episode.id) } : episode,
    );
  queryClient.setQueryData<ListEntry[]>(watchlistKey(title.type), (list) =>
    list?.map((item) =>
      item.id === title.id && 'episodes' in item ? { ...item, episodes: patch(item.episodes) } : item,
    ),
  );
  queryClient.setQueryData<SeriesEpisode[]>(episodesKey(title.type, title.tmdbId), (episodes) =>
    episodes ? patch(episodes) : episodes,
  );
}

// ─── Envoi au serveur ──────────────────────────────────────────────────────

/**
 * Requêtes qui font passer le serveur de `from` à `to`. `restore` : « Annuler » d'un
 * retrait, qui renvoie les dates d'origine pour remettre le titre exactement comme avant.
 */
async function sync(
  title: ListTitle,
  from: UserTitle | undefined,
  to: UserTitle | undefined,
  restore = false,
) {
  if (!to) {
    if (from) await removeTitle(title.id);
    return;
  }
  if (!from) {
    await addTitle(title.tmdbId, title.type, to.status, {
      notificationsEnabled: to.notificationsEnabled,
      ...(restore ? { addedAt: to.addedAt, watchedAt: to.watchedAt } : {}),
    });
    return;
  }
  const status = from.status !== to.status ? to.status : undefined;
  const notificationsEnabled =
    from.notificationsEnabled !== to.notificationsEnabled ? to.notificationsEnabled : undefined;
  if (status !== undefined || notificationsEnabled !== undefined) {
    await patchTitle(title.id, { status, notificationsEnabled });
  }
}

/** Recoche des épisodes avec leur date d'origine (une requête par date). */
async function remark(states: EpisodeStates): Promise<void> {
  const byDate = new Map<string, number[]>();
  for (const [id, watchedAt] of states) {
    if (watchedAt) byDate.set(watchedAt, [...(byDate.get(watchedAt) ?? []), id]);
  }
  for (const [watchedAt, ids] of byDate) await markEpisodes(ids, watchedAt);
}

// Une file par titre : un ajout suivi d'un « Annuler » arrive au serveur dans l'ordre.
const queues = new Map<string, Promise<void>>();
// Requêtes en cours par type : Ma liste n'est rechargée qu'une fois toutes terminées,
// pour qu'un rechargement n'écrase pas une action pas encore envoyée.
const pending = new Map<MediaType, number>();

/** Ma liste et les épisodes des fiches du type : rechargés ensemble. */
const isTypeQuery = (type: MediaType) => (query: { queryKey: readonly unknown[] }) =>
  (query.queryKey[0] === 'watchlist' || query.queryKey[0] === 'episodes') &&
  query.queryKey[1] === type;

function enqueue(title: ListTitle, request: () => Promise<void>): Promise<void> {
  const next = (queues.get(title.id) ?? Promise.resolve()).catch(() => undefined).then(request);
  queues.set(title.id, next);
  pending.set(title.type, (pending.get(title.type) ?? 0) + 1);

  const settle = () => {
    if (queues.get(title.id) === next) queues.delete(title.id);
    const left = (pending.get(title.type) ?? 1) - 1;
    pending.set(title.type, left);
    if (left === 0) void queryClient.invalidateQueries({ predicate: isTypeQuery(title.type) });
  };
  next.then(settle, settle);
  return next;
}

/** Interrompt un rechargement en cours : à sa fin, il écraserait la mise à jour optimiste. */
function cancelRefetch(title: ListTitle): Promise<void> {
  return queryClient.cancelQueries({ predicate: isTypeQuery(title.type) });
}

type Step<S> = {
  title: ListTitle;
  /** Lit l'état d'avant, applique le changement au cache et renvoie l'état d'avant. */
  apply: () => S;
  /** Remet le cache dans l'état d'avant. */
  restore: (saved: S) => void;
  /** Requêtes vers le nouvel état, puis (Annuler) de retour à l'état d'avant. */
  send: (saved: S) => Promise<void>;
  sendBack: (saved: S) => Promise<void>;
  message: string;
  undoable: boolean;
};

function run<S>({ title, apply, restore, send, sendBack, message, undoable }: Step<S>): void {
  const applied = cancelRefetch(title).then(apply);

  void applied.then((saved) =>
    enqueue(title, () => send(saved)).catch(() => {
      restore(saved);
      showToast(SAVE_FAILED);
    }),
  );

  const undo = () =>
    void applied.then(async (saved) => {
      await cancelRefetch(title);
      restore(saved);
      enqueue(title, () => sendBack(saved)).catch(() => {
        void queryClient.invalidateQueries({ predicate: isTypeQuery(title.type) });
        showToast(SAVE_FAILED);
      });
    });

  showToast(message, undoable ? undo : undefined);
}

// ─── Statut d'un titre ─────────────────────────────────────────────────────

type Change = {
  title: ListTitle;
  next: UserTitle | undefined;
  message: string;
  undoable: boolean;
};

type ChangeSaved = { snapshot: TitleSnapshot; episodes: EpisodeStates };

/**
 * Change le statut d'un titre. Retirer une série efface aussi ses épisodes vus (en base
 * comme à l'écran) : « Annuler » les recoche avec leur date d'origine.
 */
function change({ title, next, message, undoable }: Change): void {
  const removesEpisodes = !next && isSeries(title.type);
  run<ChangeSaved>({
    title,
    message,
    undoable,
    apply: () => {
      const snapshot = snapshotTitle(title);
      const episodes: EpisodeStates = new Map();
      if (removesEpisodes && snapshotUserTitle(snapshot)) {
        for (const episode of knownEpisodes(title).values()) {
          if (episode.watchedAt) episodes.set(episode.id, episode.watchedAt);
        }
      }
      applyUserTitle(title, next);
      applyEpisodes(title, new Map([...episodes.keys()].map((id) => [id, undefined])));
      return { snapshot, episodes };
    },
    restore: ({ snapshot, episodes }) => {
      restoreTitle(title, snapshot);
      applyEpisodes(title, episodes);
    },
    send: ({ snapshot }) => sync(title, snapshotUserTitle(snapshot), next),
    sendBack: async ({ snapshot, episodes }) => {
      await sync(title, next, snapshotUserTitle(snapshot), true);
      await remark(episodes);
    },
  });
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

/**
 * Retire le titre. `message` : « Retiré de ma liste » (affiche, fiche film),
 * « Retirée de ma liste » (swipe d'une série), « Série retirée » (Ne plus suivre).
 */
export function removeFromList(title: ListTitle, message = 'Retiré de ma liste'): void {
  change({ title, next: undefined, message, undoable: true });
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

/** Série abandonnée (swipe, menu) ou suivi repris. */
export function setSeriesAbandoned(title: ListTitle, abandoned: boolean): void {
  const current = currentUserTitle(title);
  if (!current) return;
  change({
    title,
    next: { ...current, status: abandoned ? 'abandoned' : 'following' },
    message: abandoned ? 'Série abandonnée' : 'Suivi repris',
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

// ─── Épisodes ──────────────────────────────────────────────────────────────

type EpisodesSaved = {
  snapshot: TitleSnapshot;
  previous: EpisodeStates;
  /** Série ajoutée par ce cochage (elle était hors liste). */
  followed?: UserTitle;
};

function episodesMessage(count: number, watched: boolean): string {
  if (watched) return count > 1 ? `${count} épisodes marqués comme vus` : 'Épisode marqué comme vu';
  return count > 1 ? 'Saison décochée' : 'Épisode décoché';
}

/**
 * Coche ou décoche des épisodes (docs/01 §4). Cocher un épisode d'une série hors liste
 * la suit automatiquement ; « Annuler » la retire alors de nouveau.
 */
export function setEpisodesWatched(
  title: ListTitle,
  episodes: readonly SeriesEpisode[],
  watched: boolean,
): void {
  if (episodes.length === 0) return;
  const ids = episodes.map((episode) => episode.id);
  run<EpisodesSaved>({
    title,
    message: episodesMessage(ids.length, watched),
    undoable: true,
    apply: () => {
      const snapshot = snapshotTitle(title);
      const known = knownEpisodes(title);
      const previous: EpisodeStates = new Map(
        ids.map((id) => [id, known.get(id)?.watchedAt ?? episodes.find((e) => e.id === id)?.watchedAt]),
      );
      const followed =
        watched && !snapshotUserTitle(snapshot) ? newUserTitle(title, 'following') : undefined;
      if (followed) applyUserTitle(title, followed);
      const now = new Date().toISOString();
      // Un épisode déjà vu garde sa date, comme côté serveur.
      applyEpisodes(
        title,
        new Map(ids.map((id) => [id, watched ? (previous.get(id) ?? now) : undefined])),
      );
      return { snapshot, previous, followed };
    },
    restore: ({ snapshot, previous }) => {
      restoreTitle(title, snapshot);
      applyEpisodes(title, previous);
    },
    send: async ({ followed }) => {
      if (!watched) {
        await unmarkEpisodes(ids);
        return;
      }
      await markEpisodes(ids);
      // Le serveur suit la série avec les alertes actives : on reprend le choix local.
      if (followed && !followed.notificationsEnabled) {
        await patchTitle(title.id, { notificationsEnabled: false });
      }
    },
    sendBack: async ({ previous, followed }) => {
      if (followed) {
        await removeTitle(title.id);
        return;
      }
      if (watched) {
        const unseen = ids.filter((id) => !previous.get(id));
        if (unseen.length > 0) await unmarkEpisodes(unseen);
        return;
      }
      await remark(previous);
    },
  });
}
