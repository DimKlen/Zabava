import { savePendingDeepLink, takePendingDeepLink } from '../pendingDeepLink';

describe('lien profond en attente', () => {
  it('rendu une seule fois', async () => {
    await savePendingDeepLink('/u/lea.m');
    expect(await takePendingDeepLink()).toBe('/u/lea.m');
    expect(await takePendingDeepLink()).toBeNull();
  });

  it('le dernier lien ouvert remplace le précédent', async () => {
    await savePendingDeepLink('/u/lea.m');
    await savePendingDeepLink('/u/max.dubois');
    expect(await takePendingDeepLink()).toBe('/u/max.dubois');
  });
});
