import { defaultSegment, segmentFor } from '../profileLists';

describe('segments', () => {
  it('Vus par défaut pour les films, En cours pour les séries', () => {
    expect(defaultSegment('movie')).toBe('watched');
    expect(defaultSegment('anime')).toBe('in_progress');
  });

  it('un segment qui n’existe pas dans l’onglet revient au défaut', () => {
    expect(segmentFor('movie', 'in_progress')).toBe('watched');
    expect(segmentFor('tv', 'towatch')).toBe('towatch');
    expect(segmentFor('tv', 'watched')).toBe('in_progress');
  });
});
