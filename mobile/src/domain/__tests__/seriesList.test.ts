import { TODAY } from '../__fixtures__/prototypeFilms';
import { PROTOTYPE_ANIME, PROTOTYPE_TV, protoSeries } from '../__fixtures__/prototypeSeries';
import { seriesInfo } from '../series';
import {
  cardEpisodeLabel,
  compactRowLabel,
  episodeTitle,
  filterSeries,
  groupSeries,
  remainingLabel,
} from '../seriesList';

describe('filterSeries', () => {
  it('Tout garde tout ; les autres filtres ne gardent qu’un sous-ensemble', () => {
    expect(filterSeries(PROTOTYPE_TV, 'all', [], TODAY)).toHaveLength(PROTOTYPE_TV.length);
    const [first, ...rest] = PROTOTYPE_TV;
    const onNetflix = {
      ...first!,
      availability: { sub: [{ id: 8, name: 'Netflix', short: 'N' }], rent: [], buy: [] },
    };
    const list = [
      onNetflix,
      ...rest.map((s) => ({ ...s, availability: { sub: [], rent: [], buy: [] } })),
    ];
    expect(filterSeries(list, 'mine', [8], TODAY)).toEqual([onNetflix]);
    expect(filterSeries(list, 'mine', [], TODAY)).toEqual([]);
    for (const s of filterSeries(PROTOTYPE_TV, 'upcoming', [], TODAY)) {
      expect(seriesInfo(s.episodes, TODAY).aired).toHaveLength(0);
    }
  });
});

describe('groupSeries', () => {
  it('un animé « terminé » selon TMDB reste dans À jour, jamais dans Terminées', () => {
    const andor = protoSeries('andor');
    expect(groupSeries([andor], TODAY).map((g) => g.key)).toEqual(['done']);
    const anime = { ...andor, type: 'anime' as const };
    expect(groupSeries([anime], TODAY).map((g) => g.key)).toEqual(['uptodate']);
  });

  it('Séries du prototype : sections dans l’ordre, vides absentes', () => {
    const groups = groupSeries(PROTOTYPE_TV, TODAY);
    expect(groups.map((g) => [g.title, g.entries.map((e) => e.series.title)])).toEqual([
      ['À regarder', ['The Bear', 'The White Lotus']],
      ['Pas regardé depuis un moment', ['The Last of Us']],
      ['Pas encore commencées', ['Shōgun']],
      ['À jour', ['Dissociation', 'Slow Horses']],
      ['Terminées', ['Andor']],
      ['Abandonnées', ['Stranger Things']],
    ]);
  });

  it('Animés du prototype', () => {
    const groups = groupSeries(PROTOTYPE_ANIME, TODAY);
    expect(groups.map((g) => [g.key, g.entries.map((e) => e.series.title)])).toEqual([
      // Comme la capture 09 : Dandadan (tout vu, saison en cours) est À jour.
      ['watch', ['Frieren', 'Jujutsu Kaisen']],
      ['notstarted', ['Spy × Family']],
      ['uptodate', ['Dandadan', 'Solo Leveling']],
    ]);
  });

  it('À regarder : le dernier visionnage le plus récent en premier', () => {
    const recent = protoSeries('whitelotus');
    const older = protoSeries('bear');
    const shift = (iso: string | undefined, days: number) =>
      iso ? new Date(new Date(iso).getTime() - days * 86_400_000).toISOString() : iso;
    const bear = {
      ...older,
      episodes: older.episodes.map((e) => ({ ...e, watchedAt: shift(e.watchedAt, 10) })),
    };
    const groups = groupSeries([bear, recent], TODAY);
    expect(groups[0]?.entries.map((e) => e.series.title)).toEqual(['The White Lotus', 'The Bear']);
  });

  it('autres sections : date d’ajout décroissante', () => {
    const a = { ...protoSeries('shogun'), id: 'tv-a', title: 'A' };
    const b = {
      ...protoSeries('shogun'),
      id: 'tv-b',
      title: 'B',
      userTitle: { ...a.userTitle, addedAt: TODAY.toISOString() },
    };
    expect(groupSeries([a, b], TODAY)[0]?.entries.map((e) => e.series.title)).toEqual(['B', 'A']);
  });
});

describe('libellés', () => {
  it('carte : « S04 E03 · Titre », « Épisode n » avec l’anti-spoiler', () => {
    const next = seriesInfo(protoSeries('bear').episodes, TODAY).next;
    if (!next) throw new Error('pas de prochain épisode');
    expect(cardEpisodeLabel(next, false)).toBe('S04 E03 · Épisode 4-3');
    expect(cardEpisodeLabel({ ...next, name: 'Bolognese' }, true)).toBe('S04 E03 · Épisode 3');
  });

  it("l'anti-spoiler ne masque pas un épisode vu", () => {
    expect(episodeTitle({ id: 1, season: 1, number: 2, name: 'Vu', watchedAt: 'x' }, true)).toBe(
      'Vu',
    );
  });

  it('épisode sans nom : « Épisode n »', () => {
    expect(episodeTitle({ id: 1, season: 1, number: 7 }, false)).toBe('Épisode 7');
  });

  it('restants', () => {
    expect(remainingLabel(8)).toBe('8 épisodes restants');
    expect(remainingLabel(1)).toBe('Dernier épisode disponible');
  });

  it('À jour avec un épisode daté : « Prochain épisode le 14 oct. »', () => {
    const info = seriesInfo(protoSeries('slow').episodes, TODAY);
    expect(compactRowLabel('uptodate', info)).toBe('Prochain épisode le 14 oct.');
  });

  it('À jour sans épisode daté : « En attente de la suite »', () => {
    const info = seriesInfo(protoSeries('severance').episodes, TODAY);
    expect(compactRowLabel('uptodate', info)).toBe('En attente de la suite');
  });

  it('Terminées et Abandonnées', () => {
    expect(compactRowLabel('done', seriesInfo(protoSeries('andor').episodes, TODAY))).toBe(
      'Terminée · 24 épisodes vus',
    );
    expect(compactRowLabel('abandoned', seriesInfo(protoSeries('stranger').episodes, TODAY))).toBe(
      'Abandonnée · 21/42 vus',
    );
  });
});
