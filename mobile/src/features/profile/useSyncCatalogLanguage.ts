import { useEffect, useRef } from 'react';

import { useProfile } from '@/api/profile';
import { toLanguageCode, useT } from '@/i18n';

import { changeCatalogSetting } from './profileActions';

/**
 * Le catalogue suit la langue de l'app (téléphone ou choix) : si le profil en garde une autre
 * (nouveau compte, téléphone changé de langue), il est mis à jour. Un seul essai par langue.
 */
export function useSyncCatalogLanguage(): void {
  const { language } = useT();
  const stored = useProfile().data?.language;
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (!stored || toLanguageCode(stored) === language || tried.current === language) return;
    tried.current = language;
    void changeCatalogSetting({ language });
  }, [stored, language]);
}
