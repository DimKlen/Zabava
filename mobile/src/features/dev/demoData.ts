/** Données de démonstration, reprises de specs/reference/data.js. */
import type { Provider } from '@/domain/types';

export type DemoTitle = { id: string; title: string; posterPath?: string };

export const demoTitles: DemoTitle[] = [
  { id: 'odyssey', title: "L'Odyssée" },
  { id: 'obaa', title: "Une bataille après l'autre" },
  { id: 'sinners', title: 'Pécheurs' },
  { id: 'superman', title: 'Superman' },
  { id: 'f1', title: 'F1' },
  { id: 'hailmary', title: 'Projet Dernière Chance' },
  { id: 'spider', title: 'Spider-Man : Un tout nouveau jour' },
  { id: 'dune3', title: 'Dune : Troisième partie' },
  { id: 'bear', title: 'The Bear' },
];

export const demoProviders: Provider[] = [
  { id: 8, name: 'Netflix', short: 'N' },
  { id: 9, name: 'Prime Video', short: 'pv' },
  { id: 337, name: 'Disney+', short: 'D+' },
  { id: 230, name: 'Crave', short: 'C' },
  { id: 350, name: 'Apple TV+', short: 'tv' },
];

export const demoEpisodes = [
  { season: 4, number: 3, name: 'Bolognese', remaining: 8 },
  { season: 4, number: 4, name: 'Worms', remaining: 7 },
  { season: 4, number: 5, name: 'Sundae', remaining: 6 },
  { season: 4, number: 6, name: 'Napkins', remaining: 5 },
];
