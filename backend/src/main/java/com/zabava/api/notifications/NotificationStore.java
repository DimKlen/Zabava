package com.zabava.api.notifications;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.zabava.api.notifications.NotificationPlanner.LogKey;
import com.zabava.api.notifications.NotificationPlanner.Type;

/** Lectures et écritures des notifications : destinataires, journal, jetons. */
@Repository
public class NotificationStore {

    /** Destinataire : un utilisateur qui a au moins un jeton Expo. */
    public record Recipient(UUID userId, List<String> tokens) {}

    /** Titre de la liste dont les alertes ne sont pas coupées (cloche de la fiche). */
    public record WatchedTitle(long titleId, int tmdbId, String mediaType, boolean anime, String title,
            String status, Boolean ended) {}

    private final JdbcClient db;

    public NotificationStore(JdbcClient db) {
        this.db = db;
    }

    public List<Recipient> recipients() {
        return db.sql("""
                select user_id, array_agg(expo_token order by updated_at desc) as tokens
                from push_tokens group by user_id
                """)
                .query((rs, n) -> new Recipient(
                        rs.getObject("user_id", UUID.class),
                        List.of((String[]) rs.getArray("tokens").getArray())))
                .list();
    }

    /** Titres de la liste avec alertes actives : films À voir et séries suivies. */
    public List<WatchedTitle> alertedTitles(UUID userId) {
        return db.sql("""
                select t.id, t.tmdb_id, t.media_type, t.is_anime, t.title, ut.status, t.ended
                from user_titles ut join titles t on t.id = ut.title_id
                where ut.user_id = :user and ut.notifications_enabled
                  and ((t.media_type = 'movie' and ut.status = 'towatch')
                    or (t.media_type = 'tv' and ut.status = 'following'))
                """)
                .param("user", userId)
                .query((rs, n) -> new WatchedTitle(
                        rs.getLong("id"),
                        rs.getInt("tmdb_id"),
                        rs.getString("media_type"),
                        rs.getBoolean("is_anime"),
                        rs.getString("title"),
                        rs.getString("status"),
                        (Boolean) rs.getObject("ended")))
                .list();
    }

    /** Titres déjà annoncés depuis {@code since} (début de la journée de l'utilisateur). */
    public Set<Long> titlesNotifiedSince(UUID userId, Instant since) {
        return new HashSet<>(db.sql("""
                select distinct title_id from notifications_log
                where user_id = :user and sent_at >= :since and title_id is not null
                """)
                .param("user", userId)
                .param("since", Timestamp.from(since))
                .query(Long.class)
                .list());
    }

    /** Clés déjà journalisées parmi celles des titres donnés. */
    public Set<LogKey> sentKeys(UUID userId, Collection<Long> titleIds) {
        if (titleIds.isEmpty()) return Set.of();
        return new HashSet<>(db.sql("""
                select type, title_id, episode_id from notifications_log
                where user_id = :user and title_id in (:ids)
                """)
                .param("user", userId)
                .param("ids", titleIds)
                .query((rs, n) -> new LogKey(
                        Type.valueOf(rs.getString("type").toUpperCase()),
                        rs.getLong("title_id"),
                        (Long) rs.getObject("episode_id")))
                .list());
    }

    /** Journalise ; renvoie false si une des clés l'était déjà (envoi concurrent). */
    public boolean log(UUID userId, List<LogKey> keys) {
        int inserted = 0;
        for (LogKey key : keys) {
            inserted += db.sql("""
                    insert into notifications_log (user_id, title_id, episode_id, type)
                    values (:user, :title, :episode, :type)
                    on conflict do nothing
                    """)
                    .param("user", userId)
                    .param("title", key.titleId())
                    .param("episode", key.episodeId())
                    .param("type", key.type().key)
                    .update();
        }
        return inserted == keys.size();
    }

    public void deleteTokens(Collection<String> tokens) {
        if (tokens.isEmpty()) return;
        db.sql("delete from push_tokens where expo_token in (:tokens)").param("tokens", tokens).update();
    }

    /** Date de sortie d'un film (salle ou numérique) dans la région. */
    public LocalDate releaseDate(long titleId, String region, String type) {
        return db.sql("select date from release_dates where title_id = :id and region = :region and type = :type")
                .param("id", titleId)
                .param("region", region)
                .param("type", type)
                .query(LocalDate.class)
                .optional()
                .orElse(null);
    }
}
