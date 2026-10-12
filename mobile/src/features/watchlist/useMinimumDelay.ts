import { useEffect, useState } from 'react';

/** Passe à true après `ms` millisecondes (squelettes affichés au moins ce temps). */
export function useMinimumDelay(ms: number): boolean {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDone(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return done;
}
