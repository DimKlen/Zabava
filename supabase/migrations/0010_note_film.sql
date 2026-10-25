-- Note (1 à 10) et commentaire d'un film vu (retours du 2026-10-24) : facultatifs, visibles
-- seulement par l'utilisateur sur la fiche du film (jamais envoyés à ses amis).
alter table user_titles
  add column rating smallint check (rating between 1 and 10),
  add column comment text check (char_length(comment) <= 1000);
