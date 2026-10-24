-- Notifications sociales (specs/social/docs/05 §5, docs/06 §5) : évènements mis en file au moment
-- de l'action, envoyés par le job des notifications (toutes les 15 min), puis marqués envoyés.
create table social_notifications (
  id bigserial primary key,
  -- Destinataire.
  user_id uuid not null references profiles on delete cascade,
  -- Auteur : nouvel abonné, demandeur, ou personne qui a accepté ma demande.
  actor_id uuid not null references profiles on delete cascade,
  type text not null check (type in ('new_follower', 'follow_request', 'follow_accepted')),
  created_at timestamptz not null default now(),
  -- Envoyée, ou écartée (interrupteur coupé, abonnement retiré, aucun appareil).
  sent_at timestamptz
);

create index social_notifications_pending on social_notifications (user_id) where sent_at is null;
-- Dédoublonnage « nouvel abonné » : une par paire de comptes et par 24 h.
create index social_notifications_pair on social_notifications (user_id, actor_id, type, created_at desc);

alter table social_notifications enable row level security;
