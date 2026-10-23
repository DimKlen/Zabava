import { useUsernameAvailability } from '@/api/social';
import { USERNAME_CHECK_MS, usernameStatus, type UsernameStatus } from '@/domain/social/username';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

export type UsernameCheck = {
  status: UsernameStatus;
  /** 3 pseudos libres, quand celui saisi est pris. */
  suggestions: string[];
  /** Nouvelle vérification (pseudo pris entre-temps : réponse 409). */
  recheck: () => void;
};

/**
 * Vérifie le pseudo 300 ms après la dernière frappe (tout de suite au premier rendu).
 * `current` : pseudo actuel, jamais vérifié.
 */
export function useUsernameCheck(value: string, current?: string | null): UsernameCheck {
  const checked = useDebouncedValue(value, USERNAME_CHECK_MS);
  const unchanged = Boolean(current) && value === current;
  const query = useUsernameAvailability(checked, checked === value && !unchanged);
  const status = usernameStatus({
    value,
    current,
    checked,
    loading: query.isFetching,
    failed: query.isError,
    result: query.data,
  });
  return {
    status,
    suggestions: status === 'taken' ? (query.data?.suggestions ?? []) : [],
    recheck: () => void query.refetch(),
  };
}
