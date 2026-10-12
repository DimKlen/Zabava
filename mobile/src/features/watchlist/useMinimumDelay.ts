import { useEffect, useState } from 'react';

// Le délai ne s'applique qu'au premier affichage de la session (entrée dans l'app),
// pas à chaque retour sur l'onglet.
let elapsed = false;

/** Passe à true après `ms` millisecondes, une seule fois par session. */
export function useMinimumDelay(ms: number): boolean {
  const [done, setDone] = useState(elapsed);
  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => {
      elapsed = true;
      setDone(true);
    }, ms);
    return () => clearTimeout(timer);
  }, [done, ms]);
  return done;
}
