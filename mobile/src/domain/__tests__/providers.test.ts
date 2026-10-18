import type { Provider } from '../types';
import {
  baseProviderName,
  groupProviders,
  searchProviders,
  toggleGroup,
  topProviders,
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

  it('logo de la version de base quand elle existe', () => {
    const [amc] = groupProviders([
      { ...provider(528, 'AMC+ Amazon Channel'), logoPath: '/channel.png' },
      { ...provider(526, 'AMC+'), logoPath: '/amc.png' },
    ]);
    expect(amc).toMatchObject({ id: 528, name: 'AMC+', logoPath: '/amc.png', ids: [528, 526] });
  });

  it('garde une plateforme sans version de base', () => {
    const groups = groupProviders([provider(1, 'Crave Starz'), provider(2, 'Disney Plus')]);
    expect(groups.map((g) => g.name)).toEqual(['Crave Starz', 'Disney Plus']);
  });
});

describe('topProviders', () => {
  const groups = groupProviders([provider(1, 'A'), provider(2, 'B'), provider(3, 'C')]);

  it('les plus connues seulement', () => {
    expect(topProviders(groups, [], 2).map((g) => g.name)).toEqual(['A', 'B']);
  });

  it('garde une plateforme cochée plus bas dans la liste', () => {
    expect(topProviders(groups, [3], 2).map((g) => g.name)).toEqual(['A', 'B', 'C']);
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
