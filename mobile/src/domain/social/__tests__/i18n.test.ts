import { useLanguageStore } from '@/i18n';

import { activitySentence, type FeedActivity } from '../feed';
import { commonLabel, friendsLabel } from '../members';

const activity: FeedActivity = {
  id: 'a1',
  createdAt: '2026-10-20T12:00:00Z',
  actor: { username: 'lea.m', displayName: 'Léa M', followState: 'following', commonCount: 0 },
  type: 'watched_episodes',
  title: { id: 't1', tmdbId: 1, type: 'tv', title: 'The Bear' },
  count: 1,
  inMyList: false,
};

afterEach(() => useLanguageStore.setState({ preference: 'auto' }));

describe('textes sociaux selon la langue', () => {
  it('accorde le pluriel des épisodes vus', () => {
    useLanguageStore.setState({ preference: 'fr' });
    expect(activitySentence(activity, new Set(), false).verb).toBe('a vu 1 épisode de');
    expect(activitySentence({ ...activity, count: 3 }, new Set(), false).verb).toBe(
      'a vu 3 épisodes de',
    );
  });

  it('place le titre au bon endroit en japonais', () => {
    useLanguageStore.setState({ preference: 'ja' });
    const added = activitySentence({ ...activity, type: 'added' }, new Set(), false);
    expect(added).toMatchObject({ verb: 'が', tail: 'をリストに追加しました' });
  });

  it('traduit les compteurs', () => {
    useLanguageStore.setState({ preference: 'en' });
    expect(commonLabel(1)).toBe('1 title in common');
    expect(commonLabel(0)).toBe('No titles in common');
    expect(friendsLabel(2)).toBe('following');
  });
});
