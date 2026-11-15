/**
 * Sous-genres et ambiances de Découvrir (demandés le 2026-11-15). Les clés sont celles de l'API
 * (Themes.java) : chacune est un ou plusieurs mots-clés TMDB.
 */
import { t } from '@/i18n';

import type { GenreKey } from './advancedSearch';

export type ThemeKey =
  | 'arts-martiaux'
  | 'braquage'
  | 'espionnage'
  | 'super-heros'
  | 'chasse-au-tresor'
  | 'road-movie'
  | 'pirates'
  | 'expedition'
  | 'humour-noir'
  | 'parodie'
  | 'satire'
  | 'histoire-vraie'
  | 'biopic'
  | 'passage-a-l-age-adulte'
  | 'judiciaire'
  | 'magie'
  | 'dragons'
  | 'contes'
  | 'vampires'
  | 'slasher'
  | 'zombies'
  | 'possession'
  | 'maison-hantee'
  | 'cyberpunk'
  | 'dystopie'
  | 'extraterrestres'
  | 'intelligence-artificielle'
  | 'tueur-en-serie'
  | 'complot'
  | 'enquete'
  | 'psychologique'
  | 'stop-motion'
  | 'pour-adultes'
  | 'nature'
  | 'true-crime'
  | 'sport'
  | 'musique'
  | 'non-lineaire'
  | 'boucle-temporelle'
  | 'voyage-dans-le-temps'
  | 'univers-paralleles'
  | 'mindfuck'
  | 'twist-final'
  | 'puzzle'
  | 'narrateur-peu-fiable'
  | 'slow-burn'
  | 'survie'
  | 'derangeant'
  | 'chat-et-souris'
  | 'found-footage'
  | 'huis-clos'
  | 'faux-documentaire'
  | 'film-d-auteur'
  | 'plan-sequence';

/** Sous-genres proposés dans la liste de chaque genre, après « Tout ». */
export const SUBGENRES: Readonly<Record<GenreKey, readonly ThemeKey[]>> = {
  action: ['arts-martiaux', 'braquage', 'espionnage', 'super-heros'],
  aventure: ['chasse-au-tresor', 'road-movie', 'pirates', 'expedition'],
  comedie: ['humour-noir', 'parodie', 'satire'],
  drame: ['histoire-vraie', 'biopic', 'passage-a-l-age-adulte', 'judiciaire'],
  fantastique: ['magie', 'dragons', 'contes', 'vampires'],
  horreur: ['slasher', 'zombies', 'possession', 'maison-hantee'],
  'science-fiction': ['cyberpunk', 'dystopie', 'extraterrestres', 'intelligence-artificielle'],
  thriller: ['tueur-en-serie', 'complot', 'enquete', 'psychologique'],
  animation: ['stop-motion', 'pour-adultes'],
  documentaire: ['nature', 'true-crime', 'sport', 'musique'],
};

export type MoodKey = 'narration' | 'psychologie' | 'tension' | 'concepts';

/** « Par ambiance » : quatre groupes, dans cet ordre. */
export const MOODS: readonly { key: MoodKey; themes: readonly ThemeKey[] }[] = [
  {
    key: 'narration',
    themes: ['non-lineaire', 'boucle-temporelle', 'voyage-dans-le-temps', 'univers-paralleles'],
  },
  { key: 'psychologie', themes: ['mindfuck', 'twist-final', 'puzzle', 'narrateur-peu-fiable'] },
  { key: 'tension', themes: ['slow-burn', 'survie', 'derangeant', 'chat-et-souris'] },
  {
    key: 'concepts',
    themes: ['found-footage', 'huis-clos', 'faux-documentaire', 'film-d-auteur', 'plan-sequence'],
  },
];

export function themeLabel(key: ThemeKey): string {
  return t(`discover.theme.${key}`);
}

export function moodLabel(key: MoodKey): string {
  return t(`discover.mood.${key}`);
}

const MOOD_THEMES = new Set<string>(MOODS.flatMap((mood) => mood.themes));

/** Ambiance de « Par ambiance » (lien `/theme/{type}/{clé}`) ; un sous-genre n'en est pas une. */
export function isMoodTheme(key: string): key is ThemeKey {
  return MOOD_THEMES.has(key);
}
