/**
 * File des écritures sur la liste (specs/docs/10 §4) : persistée dans AsyncStorage,
 * envoyée dans l'ordre, en attente hors ligne et reprise au retour du réseau.
 *
 * Les requêtes du serveur sont idempotentes (ajout = upsert, cochage sans doublon) :
 * une opération renvoyée après une coupure ne crée pas de doublon.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onlineManager } from '@tanstack/react-query';

import type { MediaType, UserTitle } from '@/domain/types';
import { showToast } from '@/store/ui';

import { ApiError } from './http';
import {
  addTitle,
  markEpisodes,
  patchTitle,
  removeTitle,
  unmarkEpisodes,
  type AddTitleExtras,
  type TitlePatch,
} from './library';
import { queryClient } from './queryClient';

/** Une requête, sous une forme qui survit au redémarrage de l'app. */
export type Op =
  | {
      kind: 'add';
      tmdbId: number;
      type: MediaType;
      status: UserTitle['status'];
      extras: AddTitleExtras;
    }
  | { kind: 'patch'; titleId: string; patch: TitlePatch }
  | { kind: 'remove'; titleId: string }
  | { kind: 'mark'; episodeIds: number[]; watchedAt?: string }
  | { kind: 'unmark'; episodeIds: number[] };

/** Une opération en file. Les opérations d'une même action partagent leur `group`. */
type Entry = { id: string; group: string; type: MediaType; op: Op };

export const SAVE_FAILED = "Impossible d'enregistrer, réessaie";

const STORAGE_KEY = 'zabava.mutation-queue';
/** Attente avant un nouvel essai, selon le nombre d'échecs d'affilée. */
const RETRY_DELAYS = [2_000, 5_000, 15_000, 30_000];
/** Erreur serveur (5xx) : abandon après ce nombre d'essais. */
const MAX_SERVER_ATTEMPTS = 4;

let entries: Entry[] = [];
let loading: Promise<void> | undefined;
let running = false;
/** File bloquée (hors ligne ou en attente d'un nouvel essai). */
let blocked = false;
/** Actions dont une requête est déjà partie (elles ne peuvent plus être retirées). */
const startedGroups = new Set<string>();
let failures = 0;
let serverAttempts = 0;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;
/** Types dont Ma liste est à recharger une fois la file vide. */
const touched = new Set<MediaType>();
const waiters = new Map<string, { resolve: () => void; reject: (error: unknown) => void }>();
let settledListeners: (() => void)[] = [];
let saving: Promise<void> = Promise.resolve();

const newId = () => `${Date.now().toString(36)}-${(sequence++).toString(36)}`;

function execute(op: Op): Promise<void> {
  switch (op.kind) {
    case 'add':
      return addTitle(op.tmdbId, op.type, op.status, op.extras);
    case 'patch':
      return patchTitle(op.titleId, op.patch);
    case 'remove':
      return removeTitle(op.titleId);
    case 'mark':
      return markEpisodes(op.episodeIds, op.watchedAt);
    case 'unmark':
      return unmarkEpisodes(op.episodeIds);
  }
}

// ─── Persistance ───────────────────────────────────────────────────────────

function load(): Promise<void> {
  loading ??= AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const stored = raw ? (JSON.parse(raw) as Entry[]) : [];
      // Ce qui a été ajouté avant la fin de la lecture passe après la file d'avant.
      entries = [...stored, ...entries];
      for (const entry of stored) touched.add(entry.type);
    })
    .catch(() => undefined);
  return loading;
}

function save(): void {
  const snapshot = JSON.stringify(entries);
  saving = saving
    .then(() =>
      entries.length === 0 && snapshot === '[]'
        ? AsyncStorage.removeItem(STORAGE_KEY)
        : AsyncStorage.setItem(STORAGE_KEY, snapshot),
    )
    .catch(() => undefined);
}

// ─── Envoi ─────────────────────────────────────────────────────────────────

/** Réseau coupé, serveur injoignable ou en erreur passagère : on réessaiera. */
function isTransient(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true;
  return error.status >= 500 && serverAttempts < MAX_SERVER_ATTEMPTS;
}

function notifySettled(): void {
  const listeners = settledListeners;
  settledListeners = [];
  for (const listener of listeners) listener();
}

function scheduleRetry(): void {
  clearTimeout(retryTimer);
  const delay = RETRY_DELAYS[Math.min(failures, RETRY_DELAYS.length) - 1] ?? RETRY_DELAYS[0];
  retryTimer = setTimeout(kick, delay);
}

function finishGroup(group: string, error?: unknown): void {
  startedGroups.delete(group);
  const waiter = waiters.get(group);
  waiters.delete(group);
  if (!error) {
    waiter?.resolve();
    return;
  }
  // Après un redémarrage, l'action d'origine n'est plus là pour restaurer l'écran :
  // Ma liste est rechargée depuis le serveur à la fin de la file.
  if (waiter) waiter.reject(error);
  else showToast(SAVE_FAILED);
}

function refreshTouched(): void {
  const types = new Set(touched);
  touched.clear();
  if (types.size === 0) return;
  void queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      queryKey[0] === 'upcoming' ||
      ((queryKey[0] === 'watchlist' || queryKey[0] === 'episodes') &&
        types.has(queryKey[1] as MediaType)),
  });
}

async function drain(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await load();
    for (let entry = entries[0]; entry; entry = entries[0]) {
      if (!onlineManager.isOnline()) {
        blocked = true;
        notifySettled();
        return;
      }
      blocked = false;
      // Une requête interrompue a pu arriver au serveur : l'action n'est plus retirable.
      startedGroups.add(entry.group);
      try {
        await execute(entry.op);
      } catch (error) {
        if (isTransient(error)) {
          if (error instanceof ApiError) serverAttempts += 1;
          failures += 1;
          blocked = true;
          scheduleRetry();
          notifySettled();
          return;
        }
        // Refus définitif : le reste de l'action est abandonné.
        failures = 0;
        serverAttempts = 0;
        entries = entries.filter((item) => item.group !== entry.group);
        save();
        finishGroup(entry.group, error);
        continue;
      }
      failures = 0;
      serverAttempts = 0;
      entries = entries.filter((item) => item.id !== entry.id);
      save();
      if (!entries.some((item) => item.group === entry.group)) finishGroup(entry.group);
    }
    blocked = false;
    refreshTouched();
    notifySettled();
  } finally {
    running = false;
  }
}

/** Relance l'envoi (retour du réseau, nouvel essai, nouvelle opération). */
function kick(): void {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  void drain();
}

// ─── API ───────────────────────────────────────────────────────────────────

/**
 * Met une action (une ou plusieurs requêtes) en file. La promesse se résout une fois
 * tout envoyé, et échoue si le serveur refuse définitivement.
 */
export function enqueue(type: MediaType, ops: Op[]): { group: string; done: Promise<void> } {
  const group = newId();
  if (ops.length === 0) return { group, done: Promise.resolve() };
  const done = new Promise<void>((resolve, reject) => waiters.set(group, { resolve, reject }));
  entries = [...entries, ...ops.map((op) => ({ id: newId(), group, type, op }))];
  touched.add(type);
  save();
  kick();
  return { group, done };
}

/**
 * Retire une action pas encore commencée (« Annuler » hors ligne : rien n'est envoyé).
 * Renvoie false si une de ses requêtes est déjà partie.
 */
export function cancelGroup(group: string): boolean {
  // Déjà envoyée, même en partie : il faudra envoyer l'inverse.
  if (startedGroups.has(group)) return false;
  const remaining = entries.filter((item) => item.group !== group);
  if (remaining.length === entries.length) return false;
  entries = remaining;
  save();
  finishGroup(group);
  return true;
}

/**
 * Se résout quand la file est vide ou bloquée hors ligne : un rechargement de Ma liste
 * attend que les écritures en cours soient parties, pour ne pas les effacer de l'écran.
 */
export async function whenSettled(): Promise<void> {
  await load();
  if (entries.length === 0 || blocked) return;
  await new Promise<void>((resolve) => settledListeners.push(resolve));
}

/** Nombre d'opérations en attente (tests, diagnostic). */
export function pendingCount(): number {
  return entries.length;
}

/** Reprend l'envoi au démarrage et à chaque retour du réseau. */
export function startMutationQueue(): () => void {
  const unsubscribe = onlineManager.subscribe((online) => {
    if (online) kick();
  });
  kick();
  return unsubscribe;
}

/** Vide la file (déconnexion) : rien ne doit partir sous le compte suivant. */
export async function clearMutationQueue(): Promise<void> {
  clearTimeout(retryTimer);
  retryTimer = undefined;
  await load();
  entries = [];
  touched.clear();
  for (const group of [...waiters.keys()]) finishGroup(group);
  startedGroups.clear();
  blocked = false;
  failures = 0;
  serverAttempts = 0;
  save();
  await saving;
  notifySettled();
}
