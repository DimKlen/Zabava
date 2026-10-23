import {
  addRecentSearch,
  personRowSubtitle,
  resultsCountLabel,
  tabForInput,
  titleRowSubtitle,
} from '../search';

describe('tabForInput', () => {
  it('« @ » en premier caractère passe sur Membres', () => {
    expect(tabForInput('all', '@le')).toBe('members');
    expect(tabForInput('movie', '@')).toBe('members');
  });

  it('sinon garde l’onglet choisi', () => {
    expect(tabForInput('movie', 'lea')).toBe('movie');
    expect(tabForInput('members', 'lea')).toBe('members');
    expect(tabForInput('all', 'a@b')).toBe('all');
  });
});

describe('addRecentSearch', () => {
  it('ajoute en tête, sans espaces autour', () => {
    expect(addRecentSearch(['dune'], '  zen ')).toEqual(['zen', 'dune']);
  });

  it('remonte une requête déjà présente au lieu de la doubler', () => {
    expect(addRecentSearch(['a', 'zen', 'b'], 'zen')).toEqual(['zen', 'a', 'b']);
  });

  it('garde 6 requêtes au plus, les plus récentes', () => {
    const recents = ['1', '2', '3', '4', '5', '6'];
    expect(addRecentSearch(recents, '7')).toEqual(['7', '1', '2', '3', '4', '5']);
  });

  it('ignore une requête vide', () => {
    expect(addRecentSearch(['a'], '   ')).toEqual(['a']);
  });
});

describe('sous-titres des lignes', () => {
  it('titre : année et type', () => {
    expect(titleRowSubtitle(2026, 'movie')).toBe('2026 · Film');
    expect(titleRowSubtitle(2023, 'anime')).toBe('2023 · Animé');
    expect(titleRowSubtitle(undefined, 'tv')).toBe('Série');
  });

  it('personne : deux titres connus au plus', () => {
    expect(personRowSubtitle(['Dune', 'Euphoria', 'Challengers'])).toBe(
      'Personne · Dune, Euphoria',
    );
    expect(personRowSubtitle([])).toBe('Personne');
  });
});

describe('resultsCountLabel', () => {
  it.each([
    [0, '0 résultat'],
    [1, '1 résultat'],
    [2, '2 résultats'],
    [1240, `${(1240).toLocaleString('fr-CA')} résultats`],
  ])('%p → %p', (count, label) => {
    expect(resultsCountLabel(count)).toBe(label);
  });
});
