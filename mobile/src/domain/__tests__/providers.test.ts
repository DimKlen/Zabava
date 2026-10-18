import type { Provider } from '../types';
import { searchProviders, simplifyProviders } from '../providers';

const provider = (id: number, name: string): Provider => ({ id, name, short: name.slice(0, 2) });

describe('simplifyProviders', () => {
  it('garde la variante la plus simple', () => {
    const list = [
      provider(1, 'Paramount Plus'),
      provider(2, 'Paramount Plus Premium'),
      provider(3, 'Paramount Plus Essential'),
      provider(4, 'AMC+'),
      provider(5, 'AMC+ Amazon Channel'),
      provider(6, 'Netflix'),
    ];
    expect(simplifyProviders(list).map((p) => p.name)).toEqual([
      'Paramount Plus',
      'AMC+',
      'Netflix',
    ]);
  });

  it('garde une plateforme sans version de base', () => {
    const list = [provider(1, 'Crave Starz'), provider(2, 'Disney Plus')];
    expect(simplifyProviders(list)).toEqual(list);
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
