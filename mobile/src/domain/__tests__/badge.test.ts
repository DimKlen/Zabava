import { bestProvider, isOnMyPlatforms, mineFirst, movieState } from '../availability';
import { posterBadge } from '../badge';

import { ALL_FILMS, MY_PROVIDER_IDS, TODAY } from '../__fixtures__/prototypeFilms';

function film(id: string) {
  const found = ALL_FILMS.find((item) => item.id === id);
  if (!found) throw new Error(`film ${id} absent`);
  return { ...found, type: 'movie' as const };
}

const netflix = { id: 8, name: 'Netflix', short: 'N' };
const crave = { id: 230, name: 'Crave', short: 'C' };
const apple = { id: 350, name: 'Apple TV+', short: 'tv' };
const prime = { id: 119, name: 'Prime Video', short: 'pv' };

describe('movieState', () => {
  it.each([
    ['dune3', 'upcoming'],
    ['odyssey', 'cinema'],
    ['sinners', 'avail'],
    ['wicked2', 'avail'],
  ] as const)('%s → %s', (id, state) => {
    expect(movieState(film(id), TODAY)).toBe(state);
  });

  it('sans offre et sorti depuis plus de 60 jours → inconnu', () => {
    expect(movieState({ ...film('odyssey'), releaseTheatrical: '2026-08-01' }, TODAY)).toBe(
      'unknown',
    );
  });

  it('sorti en salle avec un simple achat en ligne → toujours au cinéma', () => {
    const buyOnly = { sub: [], rent: [], buy: [{ id: 7, name: 'Fandango At Home', short: 'FA' }] };
    expect(
      movieState({ releaseTheatrical: '2026-10-08', availability: buyOnly }, TODAY),
    ).toBe('cinema');
  });

  it('sorti aujourd’hui : plus « à venir », mais au cinéma', () => {
    expect(movieState({ ...film('odyssey'), releaseTheatrical: '2026-10-10' }, TODAY)).toBe(
      'cinema',
    );
  });
});

describe('posterBadge (même texte que le prototype)', () => {
  it.each([
    ['dune3', { text: '18 déc.' }],
    ['odyssey', { text: 'Au cinéma', highlight: true }],
    ['wicked2', { text: 'Prime Video' }],
    ['obaa', { text: 'Prime Video' }],
    ['sinners', { text: 'Crave' }],
    ['f1', { text: 'Apple TV+' }],
    ['hailmary', { text: 'Prime Video' }],
    ['monte', { text: 'Netflix' }],
    ['spider', { text: 'Prime Video' }],
    ['kpop', { text: 'Netflix' }],
  ])('%s → %j', (id, badge) => {
    expect(posterBadge(film(id), MY_PROVIDER_IDS, TODAY)).toEqual(badge);
  });

  it('pas de badge quand la disponibilité est inconnue', () => {
    expect(
      posterBadge({ ...film('odyssey'), releaseTheatrical: '2026-01-01' }, MY_PROVIDER_IDS, TODAY),
    ).toBeNull();
  });

  it("une série affiche sa plateforme d'abonnement, sinon sa chaîne d'origine", () => {
    const disney = { id: 337, name: 'Disney+', short: 'D+' };
    const show = {
      ...film('sinners'),
      type: 'tv' as const,
      network: 'FX',
      availability: { sub: [disney], rent: [], buy: [] },
    };
    expect(posterBadge(show, MY_PROVIDER_IDS, TODAY)).toEqual({ text: 'Disney+' });
    expect(
      posterBadge(
        { ...show, availability: { sub: [disney, crave], rent: [], buy: [] } },
        MY_PROVIDER_IDS,
        TODAY,
      ),
    ).toEqual({ text: 'Crave' });
    expect(
      posterBadge(
        { ...show, availability: { sub: [], rent: [apple], buy: [] } },
        MY_PROVIDER_IDS,
        TODAY,
      ),
    ).toEqual({ text: 'FX' });
  });
});

describe('bestProvider : priorité des plateformes (docs/01 §5)', () => {
  const mine = [crave.id, netflix.id];

  it('1) un abonnement chez une de mes plateformes', () => {
    expect(bestProvider({ sub: [apple, crave], rent: [], buy: [] }, mine)).toBe(crave);
  });
  it('2) sinon le premier abonnement', () => {
    expect(bestProvider({ sub: [apple, prime], rent: [netflix], buy: [] }, mine)).toBe(apple);
  });
  it('3) sinon une location chez une de mes plateformes', () => {
    expect(bestProvider({ sub: [], rent: [apple, netflix], buy: [] }, mine)).toBe(netflix);
  });
  it('4) sinon la première location', () => {
    expect(bestProvider({ sub: [], rent: [apple, prime], buy: [crave] }, mine)).toBe(apple);
  });
  it('5) sinon le premier achat', () => {
    expect(bestProvider({ sub: [], rent: [], buy: [prime, crave] }, mine)).toBe(prime);
  });
});

describe('isOnMyPlatforms', () => {
  it('compte une location chez mes plateformes, pas un achat', () => {
    expect(isOnMyPlatforms({ sub: [], rent: [apple], buy: [] }, [apple.id])).toBe(true);
    expect(isOnMyPlatforms({ sub: [], rent: [], buy: [apple] }, [apple.id])).toBe(false);
  });
});

describe('mineFirst', () => {
  it('place mes plateformes en premier sans changer le reste de l’ordre', () => {
    expect(mineFirst([apple, crave, prime, netflix], [netflix.id, crave.id])).toEqual([
      crave,
      netflix,
      apple,
      prime,
    ]);
  });
});
