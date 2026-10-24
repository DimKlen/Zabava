package com.zabava.api.notifications;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
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

    public enum Type {
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
     * Évènement en attente. {@code valid} : la demande d'ami ou l'amitié existe toujours, et
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

    /** {@code follower} envoie une demande d'ami à {@code followee}. */
    public void followRequest(UUID follower, UUID followee) {
        enqueue(followee, follower, Type.FOLLOW_REQUEST);
    }

    /** {@code followee} accepte la demande d'ami de {@code follower}. */
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
     * ceux qui sont écartés (interrupteur coupé, demande retirée, aucun appareil) : ils ne
     * partiront jamais plus tard.
     */
    public List<PushMessage> dispatch(List<Recipient> recipients, Function<UUID, Settings> settings) {
        List<PushMessage> messages = new ArrayList<>();
        Map<UUID, List<String>> tokens = new HashMap<>();
        recipients.forEach(r -> tokens.put(r.userId(), r.tokens()));
        for (UUID userId : pendingRecipients()) {
            List<Pending> pending = pending(userId);
            List<Pending> valid = pending.stream().filter(Pending::valid).toList();
            for (Planned p : plan(valid, settings.apply(userId))) {
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

    /** Interrupteur « Demandes d'amis » : demandes reçues et demandes acceptées. */
    static List<Planned> plan(List<Pending> pending, Settings settings) {
        List<Planned> out = new ArrayList<>();
        if (!settings.prefs().followRequests()) return out;
        for (Pending p : pending) {
            if (p.type() == Type.FOLLOW_REQUEST) {
                out.add(new Planned(firstName(p) + " (@" + p.username() + ") t'a envoyé une demande d'ami",
                        "zabava://follow-requests", List.of(p.id())));
            } else if (p.type() == Type.FOLLOW_ACCEPTED) {
                out.add(new Planned(firstName(p) + " a accepté ta demande d'ami", "zabava://u/" + p.username(),
                        List.of(p.id())));
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
                      (n.type = 'follow_request' and f.follower_id = n.actor_id and f.followee_id = :me and f.status = 'pending')
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
