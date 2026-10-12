import { TODAY } from '../__fixtures__/prototypeFilms';
import { protoSeries } from '../__fixtures__/prototypeSeries';
import {
  defaultSeason,
  isAired,
  previousDialogTitle,
  previousUnwatched,
  seasonNumbers,
  seasonProgress,
  seasonToggle,
  seriesInfo,
  seriesSection,
  type SeriesEpisode,
} from '../series';
import type { UserTitle } from '../types';

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(TODAY.getTime() - n * DAY).toISOString();
const daysAhead = (n: number) => new Date(TODAY.getTime() + n * DAY).toISOString();

function ep(season: number, number: number, extra: Partial<SeriesEpisode> = {}): SeriesEpisode {
  return { id: season * 100 + number, season, number, airstamp: daysAgo(10), ...extra };
}

const following: UserTitle = {
  titleId: 'tv-1',
  status: 'following',
  addedAt: daysAgo(100),
  notificationsEnabled: true,
};

describe('isAired', () => {
  it("se fie à l'heure exacte quand elle est connue", () => {
    expect(isAired(ep(1, 1, { airstamp: new Date(TODAY.getTime() - 1000).toISOString() }), TODAY)).toBe(true);
    expect(isAired(ep(1, 1, { airstamp: new Date(TODAY.getTime() + 1000).toISOString() }), TODAY)).toBe(false);
  });

  it("sans heure, un épisode du jour est diffusé dès minuit", () => {
    expect(isAired(ep(1, 1, { airstamp: undefined, airDate: '2026-10-10' }), TODAY)).toBe(true);
    expect(isAired(ep(1, 1, { airstamp: undefined, airDate: '2026-10-11' }), TODAY)).toBe(false);
  });

  it("sans aucune date, l'épisode n'est pas diffusé", () => {
    expect(isAired(ep(1, 1, { airstamp: undefined }), TODAY)).toBe(false);
  });
});

describe('seriesInfo', () => {
  it('The Bear : prochain épisode S04 E03, 8 restants, progression arrondie', () => {
    const info = seriesInfo(protoSeries('bear').episodes, TODAY);
    expect(info.next).toMatchObject({ season: 4, number: 3 });
    expect(info.aired).toHaveLength(38);
    expect(info.watchedCount).toBe(30);
    expect(info.remaining).toBe(8);
    expect(info.progress).toBe(79);
  });

  it('ignore la saison 0 pour le prochain épisode, les restants et la progression', () => {
    const episodes = [
      ep(0, 1),
      ep(1, 1, { watchedAt: daysAgo(2) }),
      ep(1, 2),
      ep(0, 2, { watchedAt: daysAgo(1) }),
    ];
    const info = seriesInfo(episodes, TODAY);
    expect(info.next).toMatchObject({ season: 1, number: 2 });
    expect(info.aired).toHaveLength(2);
    expect(info.watchedCount).toBe(1);
    expect(info.remaining).toBe(1);
    expect(info.progress).toBe(50);
    // Le dernier visionnage ne compte pas l'épisode spécial vu hier.
    expect(info.lastWatchedAt).toBe(new Date(daysAgo(2)).getTime());
  });

  it("ne prend jamais un épisode non diffusé comme prochain épisode", () => {
    const info = seriesInfo([ep(1, 1, { watchedAt: daysAgo(1) }), ep(1, 2, { airstamp: daysAhead(3) })], TODAY);
    expect(info.next).toBeUndefined();
    expect(info.upcoming).toMatchObject({ season: 1, number: 2 });
  });

  it("le prochain épisode à venir doit être daté", () => {
    const info = seriesInfo(
      [ep(1, 1, { watchedAt: daysAgo(1) }), ep(2, 1, { airstamp: undefined }), ep(2, 2, { airstamp: daysAhead(9) })],
      TODAY,
    );
    expect(info.upcoming).toMatchObject({ season: 2, number: 2 });
    expect(info.lastAiredSeason).toBe(1);
  });

  it('sans épisode diffusé, la progression vaut 0', () => {
    expect(seriesInfo([ep(1, 1, { airstamp: daysAhead(1) })], TODAY).progress).toBe(0);
  });
});

describe('seriesSection (chaque ligne de docs/01 §3)', () => {
  const info = (episodes: SeriesEpisode[]) => seriesInfo(episodes, TODAY);

  it('hors liste → null', () => {
    expect(seriesSection(undefined, info([ep(1, 1)]), false, TODAY)).toBeNull();
  });

  it('abandonnée → abandoned, même avec des épisodes à voir', () => {
    expect(
      seriesSection({ ...following, status: 'abandoned' }, info([ep(1, 1)]), false, TODAY),
    ).toBe('abandoned');
  });

  it('aucun épisode diffusé vu → notstarted', () => {
    expect(seriesSection(following, info([ep(1, 1), ep(1, 2)]), false, TODAY)).toBe('notstarted');
  });

  it('un épisode spécial vu ne compte pas comme commencé', () => {
    expect(
      seriesSection(following, info([ep(0, 1, { watchedAt: daysAgo(1) }), ep(1, 1)]), false, TODAY),
    ).toBe('notstarted');
  });

  it('épisode à voir et dernier visionnage récent → watch', () => {
    expect(
      seriesSection(following, info([ep(1, 1, { watchedAt: daysAgo(30) }), ep(1, 2)]), false, TODAY),
    ).toBe('watch');
  });

  it('épisode à voir et dernier visionnage il y a plus de 30 jours → stale', () => {
    expect(
      seriesSection(following, info([ep(1, 1, { watchedAt: daysAgo(31) }), ep(1, 2)]), false, TODAY),
    ).toBe('stale');
  });

  it('tout vu et série terminée ou annulée → done', () => {
    expect(
      seriesSection(following, info([ep(1, 1, { watchedAt: daysAgo(400) })]), true, TODAY),
    ).toBe('done');
  });

  it('tout vu et série en production → uptodate, même avec des épisodes à venir', () => {
    expect(
      seriesSection(
        following,
        info([ep(1, 1, { watchedAt: daysAgo(1) }), ep(1, 2, { airstamp: daysAhead(4) })]),
        false,
        TODAY,
      ),
    ).toBe('uptodate');
  });

  it('les séries du prototype tombent dans les bonnes sections', () => {
    const sectionOf = (id: string) => {
      const series = protoSeries(id);
      return seriesSection(series.userTitle, info(series.episodes), series.ended, TODAY);
    };
    expect(sectionOf('bear')).toBe('watch');
    expect(sectionOf('tlou')).toBe('stale');
    expect(sectionOf('shogun')).toBe('notstarted');
    expect(sectionOf('severance')).toBe('uptodate');
    expect(sectionOf('slow')).toBe('uptodate');
    expect(sectionOf('andor')).toBe('done');
    expect(sectionOf('stranger')).toBe('abandoned');
  });
});

describe('previousUnwatched', () => {
  it('compte les épisodes diffusés non vus avant, toutes saisons confondues', () => {
    const episodes = [
      ep(1, 1, { watchedAt: daysAgo(3) }),
      ep(1, 2),
      ep(2, 1),
      ep(2, 2, { watchedAt: daysAgo(3) }),
      ep(2, 3),
    ];
    expect(previousUnwatched(episodes, ep(2, 3), TODAY).map((e) => e.id)).toEqual([102, 201]);
  });

  it("E08 alors que E05 à E07 ne sont pas vus : 3 épisodes précédents", () => {
    const episodes = Array.from({ length: 10 }, (_, i) =>
      ep(1, i + 1, i < 4 ? { watchedAt: daysAgo(1) } : {}),
    );
    const target = episodes[7];
    if (!target) throw new Error('épisode manquant');
    const previous = previousUnwatched(episodes, target, TODAY);
    expect(previous.map((e) => e.number)).toEqual([5, 6, 7]);
    expect(previousDialogTitle(previous.length)).toBe('Marquer aussi les 3 épisodes précédents ?');
  });

  it('ignore la saison 0 et les épisodes non diffusés', () => {
    const episodes = [ep(0, 1), ep(1, 1, { airstamp: daysAhead(2) }), ep(1, 2)];
    expect(previousUnwatched(episodes, ep(1, 2), TODAY)).toEqual([]);
  });

  it("un épisode spécial n'ouvre jamais le dialogue", () => {
    expect(previousUnwatched([ep(1, 1), ep(0, 1)], ep(0, 1), TODAY)).toEqual([]);
  });

  it('titre au singulier', () => {
    expect(previousDialogTitle(1)).toBe("Marquer aussi l'épisode précédent ?");
  });
});

describe('saison', () => {
  const season = [
    ep(2, 1, { watchedAt: daysAgo(1) }),
    ep(2, 2),
    ep(2, 3, { airstamp: daysAhead(1) }),
  ];

  it('le total compte tous les épisodes, diffusés ou non', () => {
    expect(seasonProgress(season, TODAY)).toMatchObject({ total: 3, watched: 1, complete: false });
  });

  it('« Tout marquer comme vu » ne coche que les épisodes diffusés non vus', () => {
    const toggle = seasonToggle(season, TODAY);
    expect(toggle.watched).toBe(true);
    expect(toggle.episodes.map((e) => e.number)).toEqual([2]);
  });

  it('« Saison vue » quand tous les diffusés sont vus : le tap les décoche tous', () => {
    const seen = season.map((e) => (e.number === 2 ? { ...e, watchedAt: daysAgo(1) } : e));
    expect(seasonProgress(seen, TODAY).complete).toBe(true);
    const toggle = seasonToggle(seen, TODAY);
    expect(toggle.watched).toBe(false);
    expect(toggle.episodes.map((e) => e.number)).toEqual([1, 2]);
  });

  it("une saison sans épisode diffusé n'est jamais « vue »", () => {
    expect(seasonProgress([ep(3, 1, { airstamp: daysAhead(5) })], TODAY).complete).toBe(false);
  });
});

describe('saisons de la fiche', () => {
  it('Spéciaux en dernier', () => {
    expect(seasonNumbers([ep(0, 1), ep(2, 1), ep(1, 1)])).toEqual([1, 2, 0]);
  });

  it('saison par défaut : celle du prochain épisode', () => {
    expect(defaultSeason(protoSeries('bear').episodes, TODAY)).toBe(4);
  });

  it('sinon celle du prochain épisode à venir', () => {
    const episodes = [
      ep(1, 1, { watchedAt: daysAgo(1) }),
      ep(2, 1, { airstamp: daysAhead(4) }),
      ep(3, 1, { airstamp: undefined }),
    ];
    expect(defaultSeason(episodes, TODAY)).toBe(2);
  });

  it('sinon la dernière saison (hors spéciaux)', () => {
    expect(defaultSeason([...protoSeries('andor').episodes, ep(0, 1, { watchedAt: daysAgo(1) })], TODAY)).toBe(2);
  });
});
