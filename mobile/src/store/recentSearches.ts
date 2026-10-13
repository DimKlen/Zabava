/** Recherches récentes, persistées dans AsyncStorage (specs/docs/04 : 6 au plus, sans doublon). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { addRecentSearch } from '@/domain/search';

type RecentSearchesState = {
  recents: string[];
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
};

export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set) => ({
      recents: [],
      add: (query) => set((s) => ({ recents: addRecentSearch(s.recents, query) })),
      remove: (query) => set((s) => ({ recents: s.recents.filter((r) => r !== query) })),
      clear: () => set({ recents: [] }),
    }),
    {
      name: 'zabava.recent-searches',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ recents: s.recents }),
    },
  ),
);
