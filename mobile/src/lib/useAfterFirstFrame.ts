import { useEffect, useState } from 'react';

/**
 * Faux au premier rendu, vrai à l'image suivante : un écran lourd affiche d'abord ce qui
 * est visible, puis monte le reste sans figer l'écran (ni les animations en cours).
 */
export function useAfterFirstFrame(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return ready;
}
