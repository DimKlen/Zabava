import { router } from 'expo-router';

import { goBack } from '../navigation';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), replace: jest.fn(), canGoBack: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('goBack', () => {
  it('revient à l’écran précédent quand il existe', () => {
    jest.mocked(router.canGoBack).mockReturnValue(true);
    goBack();
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('fiche ouverte par un lien profond (sans historique) : retour sur Ma liste', () => {
    jest.mocked(router.canGoBack).mockReturnValue(false);
    goBack();
    expect(router.back).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/watchlist');
  });
});
