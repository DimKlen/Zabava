import { translate } from '@/i18n';

import { addedCountKey } from '../addedCountKey';

describe('addedCountKey', () => {
  it.each([
    [0, "Touche une affiche pour l'ajouter"],
    [1, '1 titre ajouté'],
    [3, '3 titres ajoutés'],
  ])('%i titre(s)', (count, label) => {
    expect(translate('fr', addedCountKey(count), { count })).toBe(label);
  });
});
