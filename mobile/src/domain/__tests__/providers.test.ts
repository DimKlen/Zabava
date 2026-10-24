import type { Provider } from '../types';
import {
  baseProviderName,
  groupProviders,
  searchProviders,
  featuredProviders,
  toggleGroup,
} from '../providers';

const provider = (id: number, name: string): Provider => ({ id, name, short: name.slice(0, 2) });

describe('baseProviderName', () => {
  it.each([
    ['Paramount Plus Premium', 'Paramount Plus'],
    ['Paramount Plus Essential', 'Paramount Plus'],
    ['Peacock Premium Plus', 'Peacock'],
    ['AMC+ Amazon Channel', 'AMC+'],
    ['Paramount Plus Apple TV channel', 'Paramount Plus'],
    ['MGM Plus Roku Premium Channel', 'MGM Plus'],
    ['Amazon Prime Video with Ads', 'Amazon Prime Video'],
    ['Netflix', 'Netflix'],
    ['The Roku Channel', 'The Roku Channel'],
  ])('%s → %s', (name, base) => {
    expect(baseProviderName(name)).toBe(base);
  });
});

describe('groupProviders', () => {
  it('une entrée par service, au nom le plus simple, avec tous ses identifiants', () => {
    const groups = groupProviders([
      provider(8, 'Netflix'),
      provider(2303, 'Paramount Plus Premium'),
      provider(2616, 'Paramount Plus Essential'),
      provider(582, 'Paramount+ Amazon Channel'),
      provider(386, 'Peacock Premium'),
      provider(387, 'Peacock Premium Plus'),
      provider(175, 'Netflix Kids'),
    ]);
    expect(groups.map((g) => [g.name, g.ids])).toEqual([
      ['Netflix', [8, 175]],
      ['Paramount Plus', [2303, 2616, 582]],
      ['Peacock', [386, 387]],
    ]);
  });

  it('masque les formules avec publicités et Cosmo Go', () => {
    const groups = groupProviders([
      provider(9, 'Amazon Prime Video'),
      provider(2100, 'Amazon Prime Video with Ads'),
      provider(5, 'Cosmo Go'),
      provider(8, 'Netflix'),
      provider(1796, 'Netflix Standard with Ads'),
    ]);
    expect(groups.map((g) => [g.name, g.ids])).toEqual([
      ['Amazon Prime Video', [9]],
      ['Netflix', [8]],
    ]);
  });

  it('logo de la version de base quand elle existe', () => {
    const [amc] = groupProviders([
      { ...provider(528, 'AMC+ Amazon Channel'), logoPath: '/channel.png' },
      { ...provider(526, 'AMC+'), logoPath: '/amc.png' },
    ]);
    expect(amc).toMatchObject({ id: 528, name: 'AMC+', logoPath: '/amc.png', ids: [528, 526] });
  });

  it('réunit les pays de toutes les formules regroupées', () => {
    const [group] = groupProviders([
      { ...provider(531, 'Paramount Plus Premium'), countries: ['US'] },
      { ...provider(582, 'Paramount Plus Essential'), countries: ['CA', 'US'] },
    ]);
    expect(group?.countries).toEqual(['CA', 'US']);
  });

  it('garde une plateforme sans version de base', () => {
    const groups = groupProviders([provider(1, 'Crave Starz'), provider(2, 'Disney Plus')]);
    expect(groups.map((g) => g.name)).toEqual(['Crave Starz', 'Disney Plus']);
  });
});

describe('featuredProviders', () => {
  // Ordre de priorité TMDB des États-Unis (extrait).
  const us = groupProviders([
    provider(8, 'Netflix'),
    provider(9, 'Amazon Prime Video'),
    provider(350, 'Apple TV'),
    provider(337, 'Disney Plus'),
    provider(15, 'Hulu'),
    provider(2285, 'JustWatch TV'),
    provider(10, 'Amazon Video'),
    provider(2, 'Apple TV Store'),
    provider(2383, 'Philo'),
    provider(1899, 'HBO Max'),
    provider(283, 'Crunchyroll'),
    provider(386, 'Peacock Premium'),
  ]);

  it('les grands services d’abord, sans les plateformes peu connues', () => {
    expect(featuredProviders(us, []).map((g) => g.name)).toEqual([
      'Netflix',
      'Amazon Prime Video',
      'Disney Plus',
      'HBO Max',
      'Apple TV',
      'Hulu',
      'Peacock',
      'Crunchyroll',
    ]);
  });

  it('garde une plateforme cochée qui n’est pas un grand service', () => {
    expect(
      featuredProviders(us, [2383])
        .map((g) => g.name)
        .at(-1),
    ).toBe('Philo');
  });

  it('Canada : ICI TOU.TV, Club illico et Tubi font partie des services mis en avant', () => {
    // Ordre de priorité TMDB du Canada (extrait).
    const ca = groupProviders([
      provider(350, 'Apple TV'),
      provider(8, 'Netflix'),
      provider(1883, 'Hoopla'),
      provider(146, 'iciTouTV'),
      provider(230, 'Crave'),
      provider(73, 'Tubi TV'),
      provider(484, 'Club Illico'),
    ]);
    expect(featuredProviders(ca, []).map((g) => g.name)).toEqual([
      'Netflix',
      'Crave',
      'iciTouTV',
      'Club Illico',
      'Apple TV',
      'Tubi TV',
    ]);
  });

  it('région sans grand service connu : les premières par priorité', () => {
    const others = groupProviders([provider(1, 'A'), provider(2, 'B'), provider(3, 'C')]);
    expect(featuredProviders(others, []).map((g) => g.name)).toEqual(['A', 'B', 'C']);
  });
});

describe('boutiques rattachées à leur service', () => {
  it('Amazon Video rejoint Amazon Prime Video, Apple TV Store rejoint Apple TV', () => {
    const groups = groupProviders([
      provider(350, 'Apple TV'),
      provider(10, 'Amazon Video'),
      provider(9, 'Amazon Prime Video'),
      provider(2, 'Apple TV Store'),
    ]);
    expect(groups.map((g) => [g.name, g.ids])).toEqual([
      ['Apple TV', [350, 2]],
      ['Amazon Prime Video', [10, 9]],
    ]);
  });
});

describe('toggleGroup', () => {
  const [peacock] = groupProviders([
    provider(386, 'Peacock Premium'),
    provider(387, 'Peacock Premium Plus'),
  ]);

  it('coche toutes les formules', () => {
    expect(toggleGroup([8], peacock!)).toEqual([8, 386, 387]);
  });

  it('décoche tout le groupe, même si une seule formule était cochée', () => {
    expect(toggleGroup([8, 387], peacock!)).toEqual([8]);
  });
});

describe('searchProviders', () => {
  const list = [provider(1, 'Crème Vidéo'), provider(2, 'Netflix')];

  it('ignore la casse et les accents', () => {
    expect(searchProviders(list, 'CREME').map((p) => p.id)).toEqual([1]);
    expect(searchProviders(list, 'flix').map((p) => p.id)).toEqual([2]);
  });

  it('une requête vide garde tout', () => {
    expect(searchProviders(list, '  ')).toEqual(list);
  });
});
