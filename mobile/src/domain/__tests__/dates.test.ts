import { daysFromToday, parseLocalDate } from '../dates';
import { formatLongDate, formatShortDate } from '../format';

describe('daysFromToday', () => {
  const evening = new Date(2026, 9, 10, 23, 30);

  it('compte en jours calendaires locaux, pas en tranches de 24 h', () => {
    expect(daysFromToday('2026-10-10', evening)).toBe(0);
    expect(daysFromToday('2026-10-11', evening)).toBe(1);
    expect(daysFromToday('2026-10-09', evening)).toBe(-1);
  });

  it('passe minuit : le lendemain devient aujourd’hui', () => {
    expect(daysFromToday('2026-10-11', new Date(2026, 9, 11, 0, 1))).toBe(0);
  });

  it('ignore une heure éventuelle dans la chaîne ISO', () => {
    expect(daysFromToday('2026-12-18T00:00:00Z', evening)).toBe(69);
  });
});

describe('parseLocalDate', () => {
  it('donne minuit local, sans décalage UTC', () => {
    const date = parseLocalDate('2026-12-18');
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([
      2026, 11, 18, 0,
    ]);
  });
});

describe('formats de date fr-CA', () => {
  it('jour court', () => {
    expect(formatShortDate('2026-12-18')).toBe('18 déc.');
  });
  it('date longue', () => {
    expect(formatLongDate('2026-12-18')).toBe('18 décembre 2026');
  });
});
