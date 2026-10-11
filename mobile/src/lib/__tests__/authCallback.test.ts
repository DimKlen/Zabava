import { parseAuthCallback } from '../authCallback';

describe('parseAuthCallback', () => {
  it('lit le code PKCE dans la requête', () => {
    expect(parseAuthCallback('zabava://auth/callback?code=abc-123')).toEqual({
      code: 'abc-123',
      error: undefined,
    });
  });

  it("lit l'erreur dans le fragment", () => {
    expect(
      parseAuthCallback('zabava://auth/callback#error=access_denied&error_description=Refus+net'),
    ).toEqual({ code: undefined, error: 'access_denied' });
  });

  it('gère une requête suivie d’un fragment (Expo Go)', () => {
    expect(parseAuthCallback('exp://192.168.0.2:8081/--/auth/callback?code=x%2By#')).toEqual({
      code: 'x+y',
      error: undefined,
    });
  });

  it('renvoie un objet vide sans paramètre', () => {
    expect(parseAuthCallback('zabava://auth/callback')).toEqual({
      code: undefined,
      error: undefined,
    });
  });
});
