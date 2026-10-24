package com.zabava.api.notifications;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.zabava.api.me.dto.MeDtos.NotificationPrefs;
import com.zabava.api.notifications.ExpoPushClient.PushMessage;
import com.zabava.api.notifications.NotificationStore.Recipient;

/**
 * Notifications sociales (specs/social/docs/05 §5, docs/06 §5) : évènements mis en file au moment
 * de l'action, envoyés par le job des notifications.
 */
@Service
public class SocialNotifications {

    /** Plus de 3 nouveaux abonnés en moins d'une heure : une seule notification groupée. */
    static final int GROUP_ABOVE = 3;
    static final Duration GROUP_WINDOW = Duration.ofHours(1);
    /** Une notification « nouvel abonné » par paire de comptes et par 24 h. */
    static final Duration PAIR_WINDOW = Duration.ofHours(24);

    public enum Type {
        NEW_FOLLOWER("new_follower"),
        FOLLOW_REQUEST("follow_request"),
        FOLLOW_ACCEPTED("follow_accepted");

        final String key;

        Type(String key) {
            this.key = key;
        }

        static Type of(String key) {
            for (Type type : values()) if (type.key.equals(key)) return type;
            throw new IllegalArgumentException(key);
        }
    }

    /**
     * Évènement en attente. {@code valid} : l'abonnement (accepté) ou la demande existe toujours, et
     * l'auteur a un pseudo et n'est pas bloqué.
     */
    record Pending(long id, Type type, String username, String displayName, Instant createdAt, boolean valid) {}

    /** Message à envoyer, et les évènements qu'il couvre. */
    record Planned(String body, String url, List<Long> ids) {}

    private final JdbcClient db;
    private final Clock clock;

    public SocialNotifications(JdbcClient db, Clock clock) {
        this.db = db;
        this.clock = clock;
    }

    // ─── Mise en file ─────────────────────────────────────────────────────────

    /** {@code follower} suit {@code followee} (profil public) ; une fois par paire et par 24 h. */
    public void newFollower(UUID follower, UUID followee) {
        Instant now = clock.instant();
        db.sql("""
                insert into social_notifications (user_id, actor_id, type, created_at)
                select :to, :from, 'new_follower', :now
                where not exists (
                  select 1 from social_notifications
                  where user_id = :to and actor_id = :from and type = 'new_follower' and created_at > :since)
                """)
                .param("to", followee)
                .param("from", follower)
                .param("now", Timestamp.from(now))
                .param("since", Timestamp.from(now.minus(PAIR_WINDOW)))
                .update();
    }

    /** {@code follower} demande à suivre {@code followee} (profil privé). */
    public void followRequest(UUID follower, UUID followee) {
        enqueue(followee, follower, Type.FOLLOW_REQUEST);
    }

    /** {@code followee} accepte la demande de {@code follower}. */
    public void followAccepted(UUID follower, UUID followee) {
        enqueue(follower, followee, Type.FOLLOW_ACCEPTED);
    }

    private void enqueue(UUID to, UUID from, Type type) {
        db.sql("insert into social_notifications (user_id, actor_id, type, created_at) values (:to, :from, :type, :now)")
                .param("to", to)
                .param("from", from)
                .param("type", type.key)
                .param("now", Timestamp.from(clock.instant()))
                .update();
    }

    // ─── Envoi ────────────────────────────────────────────────────────────────

    /**
     * Messages des évènements en attente de chaque destinataire. Tous sont marqués envoyés, même
     * ceux qui sont écartés (interrupteur coupé, abonnement retiré, aucun appareil) : ils ne
     * partiront jamais plus tard.
     */
    public List<PushMessage> dispatch(List<Recipient> recipients, Function<UUID, Settings> settings) {
        List<PushMessage> messages = new ArrayList<>();
        Map<UUID, List<String>> tokens = new HashMap<>();
        recipients.forEach(r -> tokens.put(r.userId(), r.tokens()));
        for (UUID userId : pendingRecipients()) {
            List<Pending> pending = pending(userId);
            List<Pending> valid = pending.stream().filter(Pending::valid).toList();
            for (Planned p : plan(valid, settings.apply(userId), clock.instant())) {
                for (String token : tokens.getOrDefault(userId, List.of())) {
                    messages.add(new PushMessage(token, p.body(), p.url()));
                }
            }
            // Seulement ceux qu'on vient de lire : un évènement arrivé entre-temps partira au prochain passage.
            markSent(pending.stream().map(Pending::id).toList());
        }
        return messages;
    }

    /** Ce qui compte pour un destinataire : son pseudo (liens) et ses interrupteurs. */
    public record Settings(String username, NotificationPrefs prefs) {}

    /**
     * Règles : interrupteurs (« Nouvel abonné » couvre aussi les regroupements, « Demandes
     * d'abonnement » couvre aussi « Demande acceptée ») ; plus de 3 nouveaux abonnés en moins
     * d'une heure → « Léa et 4 autres te suivent » (le plus récent nommé).
     */
    static List<Planned> plan(List<Pending> pending, Settings settings, Instant now) {
        NotificationPrefs prefs = settings.prefs();
        List<Planned> out = new ArrayList<>();
        List<Pending> followers = pending.stream()
                .filter(p -> p.type() == Type.NEW_FOLLOWER && prefs.newFollower())
                .sorted(Comparator.comparing(Pending::createdAt).reversed())
                .toList();
        long recent = followers.stream().filter(p -> p.createdAt().isAfter(now.minus(GROUP_WINDOW))).count();
        if (recent > GROUP_ABOVE && settings.username() != null) {
            Pending latest = followers.getFirst();
            out.add(new Planned(
                    firstName(latest) + " et " + (followers.size() - 1) + " autres te suivent",
                    "zabava://u/" + settings.username() + "/connections?tab=followers",
                    followers.stream().map(Pending::id).toList()));
        } else {
            for (Pending p : followers) {
                out.add(new Planned(firstName(p) + " (@" + p.username() + ") te suit", "zabava://u/" + p.username(),
                        List.of(p.id())));
            }
        }
        if (prefs.followRequests()) {
            for (Pending p : pending) {
                if (p.type() == Type.FOLLOW_REQUEST) {
                    out.add(new Planned(firstName(p) + " (@" + p.username() + ") veut te suivre",
                            "zabava://follow-requests", List.of(p.id())));
                } else if (p.type() == Type.FOLLOW_ACCEPTED) {
                    out.add(new Planned(firstName(p) + " a accepté ta demande", "zabava://u/" + p.username(),
                            List.of(p.id())));
                }
            }
        }
        return out;
    }

    /** Prénom = premier mot du nom affiché, sinon le pseudo. */
    static String firstName(Pending p) {
        String name = p.displayName() == null ? "" : p.displayName().strip();
        return name.isEmpty() ? p.username() : name.split("\\s+")[0];
    }

    private List<UUID> pendingRecipients() {
        return db.sql("select distinct user_id from social_notifications where sent_at is null")
                .query(UUID.class)
                .list();
    }

    private List<Pending> pending(UUID userId) {
        return db.sql("""
                select n.id, n.type, p.username, p.display_name, n.created_at,
                  p.username is not null
                  and not exists (select 1 from blocks b where (b.blocker_id = :me and b.blocked_id = n.actor_id)
                    or (b.blocker_id = n.actor_id and b.blocked_id = :me))
                  and exists (
                    select 1 from follows f where
                      (n.type = 'new_follower' and f.follower_id = n.actor_id and f.followee_id = :me and f.status = 'accepted')
                      or (n.type = 'follow_request' and f.follower_id = n.actor_id and f.followee_id = :me and f.status = 'pending')
                      or (n.type = 'follow_accepted' and f.follower_id = :me and f.followee_id = n.actor_id and f.status = 'accepted'))
                  as valid
                from social_notifications n join profiles p on p.id = n.actor_id
                where n.user_id = :me and n.sent_at is null
                order by n.created_at
                """)
                .param("me", userId)
                .query((rs, n) -> new Pending(
                        rs.getLong("id"),
                        Type.of(rs.getString("type")),
                        rs.getString("username"),
                        rs.getString("display_name"),
                        rs.getTimestamp("created_at").toInstant(),
                        rs.getBoolean("valid")))
                .list();
    }

    private void markSent(List<Long> ids) {
        if (ids.isEmpty()) return;
        db.sql("update social_notifications set sent_at = :now where id in (:ids)")
                .param("ids", ids)
                .param("now", Timestamp.from(clock.instant()))
                .update();
    }

    /** Évènements de plus de 30 jours (purge quotidienne). */
    public int purge() {
        return db.sql("delete from social_notifications where created_at < :before")
                .param("before", Timestamp.from(clock.instant().minus(Duration.ofDays(30))))
                .update();
    }
}
