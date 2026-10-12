import {
  episodeCode,
  formatPercent,
  formatRating,
  formatRelativeDay,
  formatRuntime,
  formatTime,
  formatVotes,
} from '../format';

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

describe('formatRelativeDay (jours calendaires locaux)', () => {
  const lateEvening = new Date(2026, 9, 10, 23, 59);

  it('passe à « Demain » à minuit, pas après 24 h', () => {
    expect(formatRelativeDay(new Date(2026, 9, 10, 23, 59, 30), lateEvening)).toBe("Aujourd'hui");
    expect(formatRelativeDay(new Date(2026, 9, 11, 0, 1), lateEvening)).toBe('Demain');
    expect(formatRelativeDay(new Date(2026, 9, 11, 23, 0), new Date(2026, 9, 10, 0, 5))).toBe(
      'Demain',
    );
  });

  it('sinon le jour court : « ven. 16 oct. »', () => {
    expect(formatRelativeDay(new Date(2026, 9, 16, 21, 0), lateEvening)).toBe('ven. 16 oct.');
  });

  it('heure : « 21 h 00 »', () => {
    expect(formatTime(new Date(2026, 9, 16, 21, 0))).toBe('21 h 00');
  });
});
