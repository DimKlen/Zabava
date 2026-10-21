import { formatTime } from '../format';
import {
  eventDay,
  groupLabel,
  groupUpcoming,
  itemLine,
  itemTag,
  noDateLine,
  type UpcomingEvent,
} from '../upcoming';

// Samedi 10 octobre 2026, 12 h (heure locale du téléphone).
const NOW = new Date(2026, 9, 10, 12, 0);

const bear = { id: 'tv-1', tmdbId: 1, type: 'tv' as const, title: 'The Bear' };
const dune = { id: 'movie-2', tmdbId: 2, type: 'movie' as const, title: 'Dune' };
const abbott = { id: 'tv-3', tmdbId: 3, type: 'tv' as const, title: 'Abbott Elementary' };

/** Instant local `days` jours après aujourd'hui, à `hour` h. */
function at(days: number, hour: number, minute = 0): string {
  return new Date(2026, 9, 10 + days, hour, minute).toISOString();
}

const episode = (title: typeof bear, days: number, hour: number, number = 3): UpcomingEvent => ({
  kind: 'episode',
  date: '2026-01-01',
  title,
  season: 4,
  episode: number,
  airstamp: at(days, hour),
  provider: 'Disney+',
});

describe('jour et ligne', () => {
  it('un épisode programmé dans 2 jours tombe ce jour-là, avec l’heure locale', () => {
    const event = episode(bear, 2, 21);
    const [group] = groupUpcoming([event], NOW);
    expect(group?.label).toBe('Lun. 12 oct.');
    expect(group?.items[0]?.line).toBe(`S04 E03 · ${formatTime(new Date(at(2, 21)))}`);
    expect(group?.items[0]?.tag).toBe('Disney+');
  });

  it('le jour suit l’heure exacte, pas la date de l’API', () => {
    expect(eventDay(episode(bear, 1, 0, 1))).toEqual(new Date(2026, 9, 11));
  });

  it('films : salle, streaming, numérique', () => {
    expect(itemLine({ kind: 'theatrical', date: '2026-10-20', title: dune })).toBe(
      'Sortie en salle',
    );
    expect(itemTag({ kind: 'theatrical', date: '2026-10-20', title: dune })).toBe('Cinéma');
    const streaming = {
      kind: 'streaming' as const,
      date: '2026-10-20',
      title: dune,
      provider: 'Netflix',
    };
    expect(itemLine(streaming)).toBe('Arrive sur Netflix');
    expect(itemTag(streaming)).toBeUndefined();
    expect(itemLine({ kind: 'digital', date: '2026-10-20', title: dune })).toBe(
      'Disponible en numérique',
    );
  });

  it('libellés : Aujourd’hui, Demain, puis jour abrégé', () => {
    expect(groupLabel(new Date(2026, 9, 10, 23, 59), NOW)).toBe("Aujourd'hui");
    expect(groupLabel(new Date(2026, 9, 11, 0, 1), NOW)).toBe('Demain');
    expect(groupLabel(new Date(2026, 9, 14), NOW)).toBe('Mer. 14 oct.');
  });

  it('Sans date', () => {
    expect(noDateLine(4)).toBe('Saison 4 annoncée, date à venir');
  });
});

describe('groupUpcoming', () => {
  it('ordre : jour, heure, puis titre ; épisodes déjà diffusés et au-delà de 90 jours écartés', () => {
    const groups = groupUpcoming(
      [
        episode(bear, 1, 21),
        { kind: 'theatrical', date: '2026-10-11', title: dune },
        episode(abbott, 1, 21),
        episode(bear, 0, 9), // diffusé ce matin
        episode(bear, 0, 20, 4),
        { kind: 'digital', date: '2027-03-01', title: dune }, // > 90 jours
        { kind: 'theatrical', date: '2026-10-09', title: dune }, // hier
      ],
      NOW,
    );
    expect(groups.map((g) => g.label)).toEqual(["Aujourd'hui", 'Demain']);
    expect(groups[0]?.items.map((i) => i.event.episode)).toEqual([4]);
    expect(groups[1]?.items.map((i) => i.event.title.title)).toEqual([
      'Dune',
      'Abbott Elementary',
      'The Bear',
    ]);
  });
});
