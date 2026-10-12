package com.zabava.api.me;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Lignes de suivi d'un utilisateur : user_titles et user_episodes. */
@Repository
public class LibraryStore {

    public record UserTitleRow(
            long titleId, String status, Instant addedAt, Instant watchedAt, boolean notificationsEnabled) {}

    private final JdbcClient db;

    public LibraryStore(JdbcClient db) {
        this.db = db;
    }

    public Optional<UserTitleRow> find(UUID userId, long titleId) {
        return db.sql(SELECT + " where user_id = :user and title_id = :title")
                .param("user", userId)
                .param("title", titleId)
                .query(LibraryStore::row)
                .optional();
    }

    public List<UserTitleRow> all(UUID userId) {
        return db.sql(SELECT + " where user_id = :user order by added_at desc")
                .param("user", userId)
                .query(LibraryStore::row)
                .list();
    }

    /** Crée la ligne, ou met à jour son statut si le titre est déjà dans la liste. */
    /**
     * Ajoute ou met à jour un titre. {@code addedAt} et {@code notificationsEnabled} nuls :
     * valeurs par défaut à l'ajout, inchangées si le titre est déjà dans la liste.
     */
    public void upsert(
            UUID userId, long titleId, String status, Instant watchedAt, Instant addedAt, Boolean notificationsEnabled) {
        db.sql("""
                insert into user_titles (user_id, title_id, status, watched_at, added_at, notifications_enabled)
                values (:user, :title, :status, :watched,
                  coalesce(cast(:added as timestamptz), now()), coalesce(cast(:notif as boolean), true))
                on conflict (user_id, title_id) do update set status = excluded.status,
                  watched_at = excluded.watched_at,
                  added_at = coalesce(cast(:added as timestamptz), user_titles.added_at),
                  notifications_enabled = coalesce(cast(:notif as boolean), user_titles.notifications_enabled)
                """)
                .param("user", userId)
                .param("title", titleId)
                .param("status", status)
                .param("watched", ts(watchedAt))
                .param("added", ts(addedAt))
                .param("notif", notificationsEnabled)
                .update();
    }

    /** Ajoute la série en « following » si elle n'est pas déjà dans la liste. */
    public void followIfAbsent(UUID userId, long titleId) {
        db.sql("""
                insert into user_titles (user_id, title_id, status) values (:user, :title, 'following')
                on conflict (user_id, title_id) do nothing
                """)
                .param("user", userId)
                .param("title", titleId)
                .update();
    }

    public void update(UUID userId, long titleId, String status, Instant watchedAt, Boolean notifications) {
        db.sql("""
                update user_titles set
                  status = coalesce(cast(:status as text), status),
                  watched_at = case when cast(:status as text) is null then watched_at
                                    else cast(:watched as timestamptz) end,
                  notifications_enabled = coalesce(cast(:notifications as boolean), notifications_enabled)
                where user_id = :user and title_id = :title
                """)
                .param("status", status)
                .param("watched", ts(watchedAt))
                .param("notifications", notifications)
                .param("user", userId)
                .param("title", titleId)
                .update();
    }

    /** Retire le titre et les épisodes vus de ce titre (specs/docs/11 §3). */
    public void delete(UUID userId, long titleId) {
        db.sql("""
                delete from user_episodes where user_id = :user
                  and episode_id in (select id from episodes where title_id = :title)
                """)
                .param("user", userId)
                .param("title", titleId)
                .update();
        db.sql("delete from user_titles where user_id = :user and title_id = :title")
                .param("user", userId)
                .param("title", titleId)
                .update();
    }

    // ─── Épisodes vus ─────────────────────────────────────────────────────────

    /** Date de visionnage par id d'épisode, pour les titres donnés. */
    public Map<Long, Instant> watched(UUID userId, Collection<Long> titleIds) {
        if (titleIds.isEmpty()) return Map.of();
        Map<Long, Instant> result = new HashMap<>();
        db.sql("""
                select ue.episode_id, ue.watched_at from user_episodes ue
                join episodes e on e.id = ue.episode_id
                where ue.user_id = :user and e.title_id in (:titles)
                """)
                .param("user", userId)
                .param("titles", titleIds)
                .query((rs, n) -> result.put(rs.getLong("episode_id"), rs.getTimestamp("watched_at").toInstant()))
                .list();
        return result;
    }

    /** Idempotent : un épisode déjà vu garde sa date. */
    public void markWatched(UUID userId, Collection<Long> episodeIds, Instant watchedAt) {
        for (Long episodeId : episodeIds) {
            db.sql("""
                    insert into user_episodes (user_id, episode_id, watched_at) values (:user, :episode, :at)
                    on conflict (user_id, episode_id) do nothing
                    """)
                    .param("user", userId)
                    .param("episode", episodeId)
                    .param("at", Timestamp.from(watchedAt))
                    .update();
        }
    }

    public void unmark(UUID userId, Collection<Long> episodeIds) {
        if (episodeIds.isEmpty()) return;
        db.sql("delete from user_episodes where user_id = :user and episode_id in (:ids)")
                .param("user", userId)
                .param("ids", episodeIds)
                .update();
    }

    private static final String SELECT = """
            select title_id, status, added_at, watched_at, notifications_enabled from user_titles
            """;

    private static UserTitleRow row(ResultSet rs, int n) throws SQLException {
        Timestamp watched = rs.getTimestamp("watched_at");
        return new UserTitleRow(
                rs.getLong("title_id"),
                rs.getString("status"),
                rs.getTimestamp("added_at").toInstant(),
                watched == null ? null : watched.toInstant(),
                rs.getBoolean("notifications_enabled"));
    }

    private static Timestamp ts(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
