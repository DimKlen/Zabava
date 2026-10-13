-- Date du dernier chargement des épisodes d'une série depuis TMDB (noms, dates, heures).
-- Distincte de updated_at, que chaque ouverture de fiche rafraîchit sans recharger les épisodes.
alter table titles add column episodes_updated_at timestamptz;
