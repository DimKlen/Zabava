-- Offres et dates de sortie : seules les régions proposées dans l'app (profil) sont gardées.
-- TMDB en renvoie une soixantaine ; les écrire toutes coûtait des centaines de requêtes par fiche.
delete from title_availability where region not in ('CA', 'FR', 'BE', 'CH', 'US');
delete from release_dates where region not in ('CA', 'FR', 'BE', 'CH', 'US');
