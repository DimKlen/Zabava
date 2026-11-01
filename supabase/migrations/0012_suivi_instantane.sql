-- Suivi à sens unique et instantané (retours du 2026-11-01, à la place des amis réciproques) :
-- plus de demande à confirmer, plus de notifications sociales.

-- Les demandes en attente deviennent des suivis (le trigger follows_counters met à jour les compteurs).
update follows set status = 'accepted', accepted_at = coalesce(accepted_at, created_at) where status = 'pending';

-- Notifications sociales : file supprimée, interrupteur retiré.
drop table social_notifications;
update profiles set notification_prefs = notification_prefs - 'follow_requests';
alter table profiles alter column notification_prefs set default
  '{"episodes":true,"cinema":true,"streaming":true,"seasons":true,"digest_hour":9}';
