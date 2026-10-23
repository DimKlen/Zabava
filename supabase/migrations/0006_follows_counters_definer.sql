-- Supprimer un compte (Supabase Auth, rôle supabase_auth_admin) supprime ses abonnements en
-- cascade ; le trigger des compteurs s'exécute alors avec ce rôle, qui n'a aucun droit sur
-- public.profiles (« permission denied »). Il s'exécute désormais avec les droits de son
-- propriétaire, comme handle_new_user.
alter function public.follows_counters() security definer;
