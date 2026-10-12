import { episodeCode, formatPercent, formatRating, formatRuntime, formatVotes } from '../format';

describe('formatRating', () => {
  it.each([
    [8.5, '8,5/10'],
    [7, '7/10'],
    [9.04, '9/10'],
  ])('%p → %p', (rating, expected) => {
    expect(formatRating(rating)).toBe(expected);
  });
});

describe('formatVotes', () => {
  it.each([
    [640_312, '640 k votes'],
    [999_400, '999 k votes'],
    [1_412_000, '1,4 M votes'],
    [2_000_000, '2,0 M votes'],
  ])('%p → %p', (votes, expected) => {
    expect(formatVotes(votes)).toBe(expected);
  });
});

it('formatPercent utilise une espace insécable', () => {
  expect(formatPercent(92)).toBe('92\u00a0%');
});

describe('formatRuntime', () => {
  it.each([
    [166, '2 h 46'],
    [120, '2 h 00'],
    [45, '45 min'],
    [undefined, 'Durée inconnue'],
    [0, 'Durée inconnue'],
  ])('%p → %p', (minutes, expected) => {
    expect(formatRuntime(minutes)).toBe(expected);
  });
});

it('episodeCode garde deux chiffres minimum', () => {
  expect(episodeCode(4, 3)).toBe('S04 E03');
  expect(episodeCode(12, 105)).toBe('S12 E105');
});
