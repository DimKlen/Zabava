-- Note sur 5 étoiles entières (retours du 2026-11-03) : l'ancienne note sur 10 devient
-- arrondi(note / 2), au minimum 1. round() arrondit la moitié vers le haut (7 → 4, 5 → 3).
alter table user_titles drop constraint if exists user_titles_rating_check;
update user_titles set rating = greatest(1, round(rating / 2.0)::smallint) where rating is not null;
alter table user_titles add constraint user_titles_rating_check check (rating between 1 and 5);
