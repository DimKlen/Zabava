import { useLanguageStore } from '@/i18n';
import {
  episodeCode,
  formatLongDate,
  formatPercent,
  formatRating,
  formatRelativeDay,
  formatRuntime,
  formatShortDate,
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

describe('formats dans les autres langues', () => {
  const normalize = (text: string) => text.replace(/[  ]/g, ' ');

  afterEach(() => {
    useLanguageStore.setState({ preference: 'auto' });
  });

  it('en : jours relatifs, dates, heure, note, votes et durée', () => {
    useLanguageStore.setState({ preference: 'en' });
    const now = new Date(2026, 9, 10, 12, 0);
    expect(formatRelativeDay(new Date(2026, 9, 10, 20, 0), now)).toBe('Today');
    expect(formatRelativeDay(new Date(2026, 9, 11, 9, 0), now)).toBe('Tomorrow');
    expect(formatRelativeDay(new Date(2026, 9, 16, 21, 0), now)).toBe('Fri, Oct 16');
    expect(formatShortDate(new Date(2026, 11, 18))).toBe('Dec 18');
    expect(formatLongDate(new Date(2026, 11, 18))).toBe('December 18, 2026');
    expect(normalize(formatTime(new Date(2026, 9, 16, 21, 0)))).toBe('9:00 PM');
    expect(formatRating(8.5)).toBe('8.5/10');
    expect(formatVotes(640312)).toBe('640K votes');
    expect(formatVotes(1412000)).toBe('1.4M votes');
    expect(formatRuntime(166)).toBe('2h 46m');
    expect(formatRuntime(45)).toBe('45 min');
    expect(formatRuntime(undefined)).toBe('Unknown runtime');
    expect(formatPercent(92)).toBe('92%');
  });

  it('ja : jours relatifs, dates, heure et durée', () => {
    useLanguageStore.setState({ preference: 'ja' });
    const now = new Date(2026, 9, 10, 12, 0);
    expect(formatRelativeDay(new Date(2026, 9, 10, 20, 0), now)).toBe('今日');
    expect(formatRelativeDay(new Date(2026, 9, 11, 9, 0), now)).toBe('明日');
    expect(formatShortDate(new Date(2026, 11, 18))).toBe('12月18日');
    expect(formatLongDate(new Date(2026, 11, 18))).toBe('2026年12月18日');
    expect(formatTime(new Date(2026, 9, 16, 21, 0))).toBe('21:00');
    expect(formatRuntime(166)).toBe('2時間46分');
    expect(formatRuntime(45)).toBe('45分');
  });
});
