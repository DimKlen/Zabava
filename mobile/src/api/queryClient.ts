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
    queries: { gcTime: SEVEN_DAYS, retry: 1 },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'zabava.query-cache',
});

// Requêtes gardées hors ligne (specs/docs/10 §3) ; les fiches suivront à l'étape 5.
const PERSISTED_ROOTS = new Set(['profile', 'watchlist', 'upcoming']);

export function shouldPersistQuery(query: Query): boolean {
  return query.state.status === 'success' && PERSISTED_ROOTS.has(String(query.queryKey[0]));
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
