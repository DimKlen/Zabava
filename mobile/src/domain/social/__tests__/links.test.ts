import { inviteLink, inviteMessage, isProfilePath, usernameFromLink } from '../links';

const DOMAIN = '151-145-50-138.sslip.io';

describe('liens d’invitation', () => {
  it('lien et message de partage', () => {
    expect(inviteLink(DOMAIN, 'dim.k')).toBe('https://151-145-50-138.sslip.io/u/dim.k');
    expect(inviteMessage(DOMAIN, 'dim.k')).toBe(
      'Suis-moi sur Zabava : https://151-145-50-138.sslip.io/u/dim.k',
    );
  });
});

describe('usernameFromLink', () => {
  it('lien web du domaine et lien de l’app', () => {
    expect(usernameFromLink(`https://${DOMAIN}/u/lea.m`, DOMAIN, 'zabava')).toBe('lea.m');
    expect(usernameFromLink(`https://${DOMAIN}/u/lea.m/`, DOMAIN, 'zabava')).toBe('lea.m');
    expect(usernameFromLink(`https://${DOMAIN}/u/Lea.M?ref=qr`, DOMAIN, 'zabava')).toBe('lea.m');
    expect(usernameFromLink('zabava://u/max.dubois', DOMAIN, 'zabava')).toBe('max.dubois');
  });

  it('refuse les autres codes', () => {
    expect(usernameFromLink('https://exemple.com/u/lea.m', DOMAIN, 'zabava')).toBeNull();
    expect(usernameFromLink(`http://${DOMAIN}/u/lea.m`, DOMAIN, 'zabava')).toBeNull();
    expect(usernameFromLink(`https://${DOMAIN}/title/tv/1399`, DOMAIN, 'zabava')).toBeNull();
    expect(usernameFromLink('autre://u/lea.m', DOMAIN, 'zabava')).toBeNull();
    expect(usernameFromLink(`https://${DOMAIN}/u/a`, DOMAIN, 'zabava')).toBeNull();
    expect(usernameFromLink(`https://${DOMAIN}/u/%E0%A4%A`, DOMAIN, 'zabava')).toBeNull();
    expect(usernameFromLink('WIFI:S:maison;T:WPA;;', DOMAIN, 'zabava')).toBeNull();
  });
});

it('chemin de profil', () => {
  expect(isProfilePath('/u/lea.m')).toBe(true);
  expect(isProfilePath('/u/lea.m/connections')).toBe(false);
  expect(isProfilePath('/title/tv/1399')).toBe(false);
});
