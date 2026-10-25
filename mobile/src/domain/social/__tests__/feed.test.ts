import { formatShortDate, formatTime } from '../../format';
import {
  activitySentence,
  cardWhen,
  dayLabel,
  groupByDay,
  watchedEpisodeIds,
  type FeedActivity,
} from '../feed';
import type { Member } from '../members';

const member = (username: string, displayName: string): Member => ({
  username,
  displayName,
  followState: 'following',
  followsMe: false,
  commonCount: 0,
});

const LEA = member('lea.m', 'Léa Martin');
const BEAR = { id: 'tv-136315', tmdbId: 136315, type: 'tv' as const, title: 'The Bear' };

const activity = (patch: Partial<FeedActivity>): FeedActivity => ({
  id: '1',
  createdAt: '2026-10-20T21:40:00',
  actor: LEA,
  type: 'added',
  title: BEAR,
  count: 1,
  inMyList: false,
  ...patch,
});

const EPISODE = { id: 77, season: 4, number: 5, name: 'Tonnerre', stillPath: '/s.jpg' };
const none = new Set<number>();

describe('activitySentence', () => {
  it('ajout, film vu, série commencée, terminée', () => {
    expect(activitySentence(activity({ type: 'added' }), none, false)).toEqual({
      name: 'Léa',
      verb: 'a ajouté',
      title: 'The Bear',
      tail: ' à sa liste',
      visual: 'poster',
    });
    expect(activitySentence(activity({ type: 'watched_movie' }), none, false).verb).toBe('a vu');
    expect(activitySentence(activity({ type: 'started_show' }), none, false).verb).toBe(
      'a commencé',
    );
    expect(activitySentence(activity({ type: 'finished_show' }), none, false).verb).toBe(
      'a terminé',
    );
  });

  it('un épisode : titre et vignette', () => {
    const sentence = activitySentence(
      activity({ type: 'watched_episodes', episode: EPISODE }),
      none,
      false,
    );
    expect(sentence.verb).toBe('a vu S04 E05 « Tonnerre » de');
    expect(sentence.title).toBe('The Bear');
    expect(sentence.visual).toBe('still');
  });

  it('anti-spoiler : épisode non vu sans titre ni vignette, épisode vu en clair', () => {
    const eps = activity({ type: 'watched_episodes', episode: EPISODE });
    expect(activitySentence(eps, none, true)).toMatchObject({
      verb: 'a vu S04 E05 de',
      visual: 'poster',
    });
    expect(activitySentence(eps, new Set([77]), true)).toMatchObject({
      verb: 'a vu S04 E05 « Tonnerre » de',
      visual: 'still',
    });
  });

  it('plusieurs épisodes regroupés : affiche, sans code', () => {
    expect(
      activitySentence(
        activity({ type: 'watched_episodes', episode: EPISODE, count: 5 }),
        none,
        true,
      ),
    ).toMatchObject({ verb: 'a vu 5 épisodes de', visual: 'poster' });
  });

  it('épisode sans titre ni vignette connus', () => {
    expect(
      activitySentence(
        activity({ type: 'watched_episodes', episode: { id: 3, season: 1, number: 2 } }),
        none,
        false,
      ),
    ).toMatchObject({ verb: 'a vu S01 E02 de', visual: 'poster' });
  });
});

describe('jours du fil', () => {
  const now = new Date(2026, 9, 21, 0, 5);

  it('autour de minuit : la veille est « Hier », l’avant-veille a sa date', () => {
    expect(dayLabel(new Date(2026, 9, 21, 0, 1), now)).toBe("Aujourd'hui");
    expect(dayLabel(new Date(2026, 9, 20, 23, 59), now)).toBe('Hier');
    expect(dayLabel(new Date(2026, 9, 19, 23, 59), now)).toBe('Lun. 19 oct.');
    expect(dayLabel(new Date(2026, 9, 20, 0, 0), now)).toBe('Hier');
  });

  it('groupes par jour calendaire, dans l’ordre reçu', () => {
    const at = (d: Date, id: string) => activity({ id, createdAt: d.toISOString() });
    const days = groupByDay(
      [
        at(new Date(2026, 9, 21, 0, 2), 'a'),
        at(new Date(2026, 9, 20, 23, 50), 'b'),
        at(new Date(2026, 9, 20, 8, 0), 'c'),
        at(new Date(2026, 9, 18, 12, 0), 'd'),
      ],
      now,
    );
    expect(days.map((d) => [d.label, d.items.map((i) => i.id)])).toEqual([
      ["Aujourd'hui", ['a']],
      ['Hier', ['b', 'c']],
      ['Dim. 18 oct.', ['d']],
    ]);
  });

  it('« quand » des cartes : heure, « Hier », date courte', () => {
    const today = new Date(2026, 9, 21, 0, 2);
    expect(cardWhen(today, now)).toBe(formatTime(today));
    expect(cardWhen(new Date(2026, 9, 20, 22, 0), now)).toBe('Hier');
    const older = new Date(2026, 9, 7, 9, 0);
    expect(cardWhen(older, now)).toBe(formatShortDate(older));
  });
});

it('épisodes vus d’après Ma liste', () => {
  expect(
    watchedEpisodeIds([
      { episodes: [{ id: 1, watchedAt: '2026-10-01T00:00:00Z' }, { id: 2 }] },
      { episodes: [{ id: 9, watchedAt: '2026-10-02T00:00:00Z' }] },
    ]),
  ).toEqual(new Set([1, 9]));
});
