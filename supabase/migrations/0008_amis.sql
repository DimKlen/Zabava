-- Amis réciproques (retours du 2026-10-24, à la place du suivi à sens unique de specs/social) :
-- une demande d'ami est un abonnement « pending » ; une amitié, deux abonnements « accepted »,
-- un dans chaque sens. Seuls les amis voient listes et activité : plus de profil public.

-- Abonnements acceptés existants : l'amitié dans l'autre sens (une demande en sens inverse est
-- acceptée au passage). Le trigger follows_counters tient les compteurs à jour.
insert into follows (follower_id, followee_id, status, created_at, accepted_at)
select f.followee_id, f.follower_id, 'accepted', f.created_at, f.accepted_at
from follows f
where f.status = 'accepted'
on conflict (follower_id, followee_id) do update
  set status = 'accepted', accepted_at = coalesce(follows.accepted_at, excluded.accepted_at)
  where follows.status = 'pending';

-- Plus d'activité « suit maintenant » ni de notification « nouvel abonné ».
delete from activities where type = 'followed';
delete from social_notifications where type = 'new_follower';

-- Plus de profil public ni privé ; le pseudo ne change plus après l'inscription.
alter table profiles drop column is_private;
alter table profiles drop column username_changed_at;
drop table username_history;

-- Interrupteur « Nouvel abonné » retiré.
update profiles set notification_prefs = notification_prefs - 'new_follower';
alter table profiles alter column notification_prefs set default
  '{"episodes":true,"cinema":true,"streaming":true,"seasons":true,"digest_hour":9,"follow_requests":true}';
