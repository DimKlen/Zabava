import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, QueryClient, type Query } from '@tanstack/react-query';

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** Durée de conservation du cache persisté (specs/docs/10 §3). */
export const persistMaxAge = SEVEN_DAYS;

export const queryClient = new QueryClient({
  defaultOptions: {
    // gcTime ≥ maxAge : sinon les requêtes persistées seraient purgées avant restauration.
    // networkMode 'always' : hors ligne, une requête sans cache échoue (« Impossible de
    // charger » + « Réessayer ») au lieu de rester en pause sur un écran vide ; avec du
    // cache, l'écran garde ses données. Le retour du réseau relance les requêtes périmées.
    queries: { gcTime: SEVEN_DAYS, retry: 1, networkMode: 'always' },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'zabava.query-cache',
});

// Requêtes gardées hors ligne (specs/docs/10 §3).
const PERSISTED_ROOTS = new Set(['profile', 'watchlist', 'upcoming']);
// Fiche et épisodes : seulement pour les titres de Ma liste.
const LIST_TITLE_ROOTS = new Set(['title', 'episodes']);

/** Carrousel de Découvrir (`['discover', { list, type }]`), pas les listes infinies. */
function isDiscoverCarousel(key: readonly unknown[]): boolean {
  const params = key[1];
  return key[0] === 'discover' && typeof params === 'object' && params !== null && 'list' in params;
}

/** Le titre est-il dans Ma liste (cache) ? Un animé peut être ouvert sous « tv ». */
function isInList(type: unknown, tmdbId: unknown): boolean {
  const types = type === 'movie' ? ['movie'] : ['tv', 'anime'];
  return types.some((listType) =>
    queryClient
      .getQueryData<{ tmdbId: number }[]>(['watchlist', listType])
      ?.some((item) => item.tmdbId === tmdbId),
  );
}

/** Profils visités et leurs listes de titres (specs/social/docs/07 §2), pas leurs abonnés. */
function isVisitedProfile(key: readonly unknown[]): boolean {
  return key[0] === 'user' && (key.length === 2 || key[2] === 'titles');
}

export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false;
  const [root, type, tmdbId] = query.queryKey;
  if (PERSISTED_ROOTS.has(String(root))) return true;
  if (isVisitedProfile(query.queryKey)) return true;
  // Découvrir s'ouvre aussitôt au lancement suivant, puis se met à jour s'il a plus d'un jour.
  if (isDiscoverCarousel(query.queryKey)) return true;
  return LIST_TITLE_ROOTS.has(String(root)) && isInList(type, tmdbId);
}

/** Branche onlineManager sur NetInfo (appelé une fois au démarrage). */
export function setupOnlineManager(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
}

/** Vide le cache mémoire et persisté (déconnexion, session expirée). */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await queryPersister.removeClient();
}
