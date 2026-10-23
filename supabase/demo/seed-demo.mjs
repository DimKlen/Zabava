// Comptes de démonstration de la partie sociale (membres de specs/social/reference/social.js).
//
// Crée (ou réinitialise) les comptes, leur pseudo, leur liste et leurs abonnements en passant
// par la vraie API : les activités du fil sont donc écrites comme en usage réel.
//
//   node supabase/demo/seed-demo.mjs
//
// Variables : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (clé secrète, jamais affichée),
// API_URL (défaut http://localhost:8080). Le compte réel de l'utilisateur n'est jamais touché.
// Courriels en @example.com (réservé), mots de passe aléatoires régénérés à chaque passage.

import { randomBytes } from 'node:crypto';

const SUPABASE_URL = need('SUPABASE_URL');
const SERVICE_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
const API = (process.env.API_URL ?? 'http://localhost:8080') + '/api/v1';
const ZONE_OFFSET = '-04:00'; // America/Toronto en octobre

// ─── Données du prototype (social.js) ────────────────────────────────────────
// lib : w = film vu, t = à voir / pas commencée, d = terminée, cS.E = en cours à SxxEyy, a = abandonnée.
const MEMBERS = {
  'lea.m': { name: 'Léa Martin', fw: ['max.dubois', 'sarah.l', 'camille.r', 'ines.t', 'nora.k'], lib: 'dune2:w,opp:w,anat:w,sinners:w,kpop:w,dune3:t,odyssey:t,bear:c4.5,whitelotus:d,severance:d,frieren:d,jjk:c3.2,shogun:t,pitt:c1.9,adolescence:d' },
  'max.dubois': { name: 'Max Dubois', fw: ['lea.m', 'theo.g', 'lucas.m', 'hugo.p'], lib: 'opp:w,f1:w,superman:w,obaa:w,odyssey:w,dune2:w,avengers:t,spider:t,andor:d,slow:c6.2,tlou:c2.7,stranger:d,solo:d,kaiju:c2.4' },
  'sarah.l': { name: 'Sarah Lefebvre', fw: ['lea.m', 'nora.k', 'zoe.l'], lib: 'monte:w,anat:w,wicked2:w,kpop:w,hailmary:t,odyssey:t,whitelotus:c3.6,bear:c3.8,adolescence:d,spy:c3.5,frieren:c2.4' },
  yanis_b: { name: 'Yanis Benali', fw: ['max.dubois', 'lucas.m', 'hugo.p', 'amelie.b'], lib: 'sinners:w,obaa:w,hailmary:w,dune2:w,dune3:t,severance:d,shogun:d,andor:d,dandadan:c3.1,jjk:d,solo:d,kaiju:d' },
  'camille.r': { name: 'Camille Roy', priv: true, fw: ['lea.m', 'sarah.l'], lib: 'anat:w,monte:w,opp:w,odyssey:t,bear:d,whitelotus:d,pitt:c1.12,tlou:a' },
  'theo.g': { name: 'Théo Gagnon', fw: ['max.dubois', 'lucas.m'], lib: 'superman:w,f1:w,spider:w,avengers:t,stranger:d,tlou:c2.5,dandadan:d,spy:d' },
  'ines.t': { name: 'Inès Tremblay', fw: ['lea.m', 'nora.k', 'hugo.p'], lib: 'dune2:w,opp:w,hailmary:w,wicked2:t,frieren:d,dandadan:c3.2,bear:c4.2,severance:d,slow:d' },
  'hugo.p': { name: 'Hugo Pelletier', fw: ['zoe.l', 'lucas.m', 'max.dubois'], lib: 'odyssey:w,dune2:w,opp:w,anat:w,sinners:w,obaa:w,bear:d,severance:d,shogun:d,tlou:d,frieren:d,slow:d,andor:d' },
  'nora.k': { name: 'Nora Khalil', fw: ['sarah.l', 'lea.m', 'zoe.l'], lib: 'odyssey:w,dune2:w,monte:w,anat:w,kpop:w,whitelotus:d,adolescence:d,frieren:c2.8,spy:d,bear:c4.1' },
  'julien.c': { name: 'Julien Côté', priv: true, fw: ['max.dubois'], lib: 'opp:w,dune2:w,f1:w,odyssey:w,stranger:d' },
  'amelie.b': { name: 'Amélie Bouchard', fw: ['yanis_b', 'zoe.l'], lib: 'odyssey:w,opp:w,dune2:w,wicked2:w,kpop:w,severance:c2.4,slow:d,andor:c2.6,jjk:d' },
  'lucas.m': { name: 'Lucas Morin', fw: ['max.dubois', 'theo.g', 'hugo.p'], lib: 'odyssey:w,dune2:w,opp:w,sinners:w,f1:w,tlou:d,stranger:d,solo:d,dandadan:d,jjk:c3.4,kaiju:d' },
  'zoe.l': { name: 'Zoé Lavoie', fw: ['hugo.p', 'nora.k', 'sarah.l'], lib: 'odyssey:w,anat:w,dune2:w,opp:w,bear:d,whitelotus:d,frieren:d,severance:d' },
  'emma.d': { name: 'Emma Dupuis', fw: ['chloe.v'], lib: 'kpop:w,wicked2:w,spy:c3.2' },
  'karim.a': { name: 'Karim Aziz', fw: ['lucas.m'], lib: 'f1:w,superman:w,solo:d' },
  'chloe.v': { name: 'Chloé Vachon', fw: ['emma.d', 'sarah.l'], lib: 'monte:w,anat:w,adolescence:d' },
};

// Activités récentes du prototype (ACT) : [membre, type, titre, détail, jour, heure].
const RECENT = [
  ['lea.m', 'eps', 'bear', { s: 4, e: 5 }, 0, '21:40'], ['hugo.p', 'movie', 'odyssey', null, 0, '20:55'],
  ['max.dubois', 'movie', 'odyssey', null, 0, '20:15'], ['yanis_b', 'start', 'dandadan', null, 0, '18:02'],
  ['sarah.l', 'add', 'hailmary', null, 0, '12:30'], ['lea.m', 'follow', null, { target: 'ines.t' }, 0, '10:05'],
  ['theo.g', 'eps', 'tlou', { n: 5 }, -1, '23:10'], ['nora.k', 'eps', 'frieren', { s: 2, e: 8 }, -1, '22:30'],
  ['max.dubois', 'finish', 'stranger', null, -1, '22:00'], ['amelie.b', 'movie', 'odyssey', null, -1, '21:10'],
  ['camille.r', 'movie', 'anat', null, -1, '19:45'], ['yanis_b', 'add', 'dune3', null, -1, '14:20'],
  ['lucas.m', 'finish', 'solo', null, -2, '23:00'], ['lea.m', 'movie', 'kpop', null, -2, '21:00'],
  ['sarah.l', 'eps', 'frieren', { s: 2, e: 4 }, -2, '20:30'], ['theo.g', 'finish', 'spy', null, -2, '17:10'],
  ['max.dubois', 'add', 'avengers', null, -3, '13:00'], ['yanis_b', 'finish', 'severance', null, -3, '11:45'],
  ['camille.r', 'follow', null, { target: 'lea.m' }, -4, '16:40'], ['lea.m', 'start', 'pitt', null, -4, '09:15'],
];

// Recherche TMDB de chaque titre du prototype : [requête, type, année].
const TITLES = {
  odyssey: ['The Odyssey', 'movie', 2026], obaa: ['One Battle After Another', 'movie', 2025],
  sinners: ['Sinners', 'movie', 2025], superman: ['Superman', 'movie', 2025], f1: ['F1', 'movie', 2025],
  hailmary: ['Project Hail Mary', 'movie', 2026], spider: ['Spider-Man: Brand New Day', 'movie', 2026],
  dune3: ['Dune: Part Three', 'movie', 2026], avengers: ['Avengers: Doomsday', 'movie', 2026],
  dune2: ['Dune: Part Two', 'movie', 2024], opp: ['Oppenheimer', 'movie', 2023],
  monte: ['Le Comte de Monte-Cristo', 'movie', 2024], anat: ["Anatomie d'une chute", 'movie', 2023],
  wicked2: ['Wicked: For Good', 'movie', 2025], kpop: ['KPop Demon Hunters', 'movie', 2025],
  bear: ['The Bear', 'tv', 2022], whitelotus: ['The White Lotus', 'tv', 2021], tlou: ['The Last of Us', 'tv', 2023],
  severance: ['Severance', 'tv', 2022], slow: ['Slow Horses', 'tv', 2022], shogun: ['Shōgun', 'tv', 2024],
  andor: ['Andor', 'tv', 2022], stranger: ['Stranger Things', 'tv', 2016], pitt: ['The Pitt', 'tv', 2025],
  adolescence: ['Adolescence', 'tv', 2025], frieren: ['Frieren', 'anime', 2023],
  jjk: ['Jujutsu Kaisen', 'anime', 2020], dandadan: ['Dandadan', 'anime', 2024],
  solo: ['Solo Leveling', 'anime', 2024], spy: ['Spy x Family', 'anime', 2022], kaiju: ['Kaiju No. 8', 'anime', 2024],
};

// ─── Outils ──────────────────────────────────────────────────────────────────

function need(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Variable ${name} manquante`);
  return value;
}

const hash = (s) => [...String(s)].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);
const DAY = 24 * 3600 * 1000;
const now = Date.now();
/** Jour 0 du prototype : aujourd'hui si 22 h est passé à Toronto, sinon hier (pas d'heure future). */
const torontoHour = new Date(now - 4 * 3600 * 1000).getUTCHours();
const day0 = new Date(now - 4 * 3600 * 1000 - (torontoHour >= 22 ? 0 : DAY)).toISOString().slice(0, 10);
const at = (dayOffset, hm) => {
  const base = new Date(`${day0}T${hm}:00${ZONE_OFFSET}`).getTime();
  return new Date(base + dayOffset * DAY).toISOString();
};
const daysAgo = (n, hm = '20:30') => at(-n, hm);

async function call(method, path, token, body) {
  const response = await fetch(path.startsWith('http') ? path : API + path, {
    method,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : undefined;
}

async function admin(method, path, body) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin${path}`, {
    method,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`admin ${method} ${path} → ${response.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : undefined;
}

/** Crée le compte s'il manque (sinon change son mot de passe) et renvoie un jeton de session. */
async function signIn(username, name) {
  const email = `demo.${username.replace(/[._]/g, '-')}@example.com`;
  const password = randomBytes(18).toString('base64url');
  const { users } = await admin('GET', `/users?per_page=200`);
  const existing = users.find((u) => u.email === email);
  if (existing) await admin('PUT', `/users/${existing.id}`, { password });
  else await admin('POST', '/users', { email, password, email_confirm: true, user_metadata: { full_name: name } });
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await response.json();
  if (!response.ok) throw new Error(`connexion ${username} → ${response.status}`);
  return session.access_token;
}

const resolved = new Map();
async function tmdbId(token, key) {
  if (resolved.has(key)) return resolved.get(key);
  const [query, type, year] = TITLES[key];
  const { titles } = await call('GET', `/search?q=${encodeURIComponent(query)}&type=${type}`, token);
  const match = titles.find((t) => t.year === year) ?? titles.find((t) => Math.abs((t.year ?? 0) - year) <= 1);
  if (!match) throw new Error(`Titre introuvable : ${query}`);
  resolved.set(key, match.tmdbId);
  return match.tmdbId;
}

const isAired = (e) => {
  const date = e.airstamp ?? (e.airDate ? `${e.airDate}T00:00:00Z` : null);
  return date !== null && new Date(date).getTime() <= now;
};

// ─── Liste d'un membre ───────────────────────────────────────────────────────

async function seedLibrary(username, token) {
  const recent = RECENT.filter((r) => r[0] === username);
  for (const part of MEMBERS[username].lib.split(',')) {
    const [key, code] = part.split(':');
    const [, type] = TITLES[key];
    const id = await tmdbId(token, key);
    const ago = (hash(username + key) % 60) + 1;
    const event = recent.find((r) => r[2] === key);
    const addedAt = event?.[1] === 'add' ? at(event[4], event[5]) : daysAgo(ago + 12, '19:00');

    if (type === 'movie') {
      const watched = code === 'w';
      const watchedAt = event?.[1] === 'movie' ? at(event[4], event[5]) : daysAgo(ago);
      await call('POST', '/me/titles', token, {
        tmdbId: id, type, status: watched ? 'watched' : 'towatch', addedAt, ...(watched ? { watchedAt } : {}),
      });
      continue;
    }

    await call('POST', '/me/titles', token, { tmdbId: id, type, status: 'following', addedAt });
    if (code === 't') continue;
    const episodes = (await call('GET', `/titles/${type}/${id}/episodes`, token))
      .filter((e) => e.season > 0 && isAired(e))
      .sort((a, b) => a.season - b.season || a.number - b.number);
    let upTo = episodes;
    if (code[0] === 'c') {
      const [s, n] = code.slice(1).split('.').map(Number);
      upTo = episodes.filter((e) => e.season < s || (e.season === s && e.number <= n));
    } else if (code === 'a') {
      upTo = episodes.slice(0, 3);
    }
    if (upTo.length === 0) continue;

    // Les derniers épisodes vus à la date de l'activité récente, le reste plus tôt.
    const lastAt = event && event[1] !== 'add' ? at(event[4], event[5]) : daysAgo(ago);
    const tail = event?.[1] === 'start' ? upTo.length : event?.[3]?.n ?? 1;
    const backlog = upTo.slice(0, upTo.length - tail);
    const latest = upTo.slice(upTo.length - tail);
    if (backlog.length) {
      await call('POST', '/me/episodes/watched', token, {
        episodeIds: backlog.map((e) => e.id), watchedAt: daysAgo(ago + 10, '21:00'),
      });
    }
    await call('POST', '/me/episodes/watched', token, { episodeIds: latest.map((e) => e.id), watchedAt: lastAt });
    if (code === 'a') await call('PATCH', `/me/titles/${type}-${id}`, token, { status: 'abandoned' });
  }
}

// ─── Programme ───────────────────────────────────────────────────────────────

const tokens = {};
for (const [username, member] of Object.entries(MEMBERS)) {
  tokens[username] = await signIn(username, member.name);
  const token = tokens[username];
  const profile = await call('GET', '/me/profile', token);
  await call('PUT', '/me/profile', token, {
    username, displayName: member.name, isPrivate: false, region: 'CA', language: 'fr-CA',
    onboardedAt: profile.onboardedAt ?? new Date(now - 90 * DAY).toISOString(),
  });
  // Réinitialisation : liste et abonnements repartent de zéro.
  for (const type of ['movie', 'tv', 'anime']) {
    for (const item of await call('GET', `/me/watchlist?type=${type}`, token)) {
      await call('DELETE', `/me/titles/${item.id}`, token);
    }
  }
  for (const page of [await call('GET', `/users/${username}/following`, token)]) {
    for (const followee of page.items) await call('DELETE', `/users/${followee.username}/follow`, token);
  }
  console.log(`compte ${username} prêt`);
}

for (const username of Object.keys(MEMBERS)) {
  await seedLibrary(username, tokens[username]);
  console.log(`liste de ${username} remplie`);
}

// Abonnements : tout le monde est public pendant la mise en place, puis privé si besoin.
for (const [username, member] of Object.entries(MEMBERS)) {
  for (const followee of member.fw) await call('POST', `/users/${followee}/follow`, tokens[username]);
}
for (const [username, member] of Object.entries(MEMBERS)) {
  if (member.priv) await call('PUT', '/me/profile', tokens[username], { isPrivate: true });
}
console.log('abonnements faits');

// Dates des abonnements « suit maintenant » du prototype : à régler en SQL (accepted_at et activité).
for (const [username, , , detail, dayOffset, hm] of RECENT.filter((r) => r[1] === 'follow')) {
  console.log(`-- ${username} → ${detail.target} : ${at(dayOffset, hm)}`);
}
console.log(`jour 0 du prototype : ${day0}`);
