import { initials, posterInitial } from '../initials';

describe('initials', () => {
  it.each([
    ['Zendaya', 'Z'],
    ['Timothée Chalamet', 'TC'],
    ['Jeremy Allen White', 'JA'],
    ['  Ayo   Edebiri ', 'AE'],
    ['50 Cent Jackson', 'CJ'],
    ['Élodie Yung', 'ÉY'],
    ['', ''],
  ])('%p → %p', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe('posterInitial', () => {
  it.each([
    ['The Bear', 'B'],
    ["L'Odyssée", 'O'],
    ['Le Comte de Monte-Cristo', 'C'],
    ['La La Land', 'L'],
    ['Les Misérables', 'M'],
    ['Une bataille après l’autre', 'B'],
    ['dune : troisième partie', 'D'],
    ['Lesbos', 'L'],
    ['', ''],
  ])('%p → %p', (title, expected) => {
    expect(posterInitial(title)).toBe(expected);
  });
});
