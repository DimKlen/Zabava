import { useLanguageStore } from '@/i18n';

import { commonLabel, friendsLabel } from '../members';

afterEach(() => useLanguageStore.setState({ preference: 'auto' }));

describe('textes sociaux selon la langue', () => {
  it('traduit les compteurs', () => {
    useLanguageStore.setState({ preference: 'en' });
    expect(commonLabel(1)).toBe('1 title in common');
    expect(commonLabel(0)).toBe('No titles in common');
    expect(friendsLabel(2)).toBe('following');
  });
});
