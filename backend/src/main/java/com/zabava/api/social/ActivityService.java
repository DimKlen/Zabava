package com.zabava.api.social;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Écriture des activités du fil (specs/social/docs/06 §2).
 *
 * Les activités d'un titre sont **recalculées à partir de l'état du suivi** après chaque action
 * (ajout, vu, cochage, retrait, décochage) : « Annuler », un renvoi de la file hors ligne ou un
 * cochage en double redonnent exactement les mêmes lignes.
 * <ul>
 *   <li>film à voir : {@code added} (date d'ajout) ;</li>
 *   <li>film vu : {@code watched_movie} (date de visionnage), plus {@code added} s'il a été
 *       ajouté un autre jour ;</li>
 *   <li>série : {@code added}, {@code started_show} dès un épisode vu, {@code finished_show} quand
 *       elle est terminée et tous ses épisodes diffusés vus, et une ligne {@code watched_episodes}
 *       par jour (fuseau de l'utilisateur) avec le nombre d'épisodes vus ce jour-là ;</li>
 *   <li>titre retiré : plus aucune activité.</li>
 * </ul>
 * Rien n'est créé au-delà de la rétention de 180 jours.
 */
@Service
public class ActivityService {

    static final Duration RETENTION = Duration.ofDays(180);

    private static final String ONCE_TYPES = "type in ('added', 'watched_movie', 'started_show', 'finished_show')";

    private record Tracked(String mediaType, String status, Instant addedAt, Instant watchedAt) {}

    private final JdbcClient db;
    private final SocialStore social;
    private final Clock clock;

    public ActivityService(JdbcClient db, SocialStore social, Clock clock) {
        this.db = db;
        this.social = social;
        this.clock = clock;
    }

    public void syncTitles(UUID userId, Collection<Long> titleIds) {
        titleIds.stream().distinct().forEach(titleId -> syncTitle(userId, titleId));
    }

    /** Recalcule les activités d'un titre pour cet utilisateur. */
    public void syncTitle(UUID userId, long titleId) {
        Optional<Tracked> tracked = db.sql("""
                select t.media_type, ut.status, ut.added_at, ut.watched_at
                from user_titles ut join titles t on t.id = ut.title_id
                where ut.user_id = :user and ut.title_id = :title
                """)
                .param("user", userId)
                .param("title", titleId)
                .query((rs, n) -> new Tracked(
                        rs.getString("media_type"),
                        rs.getString("status"),
                        rs.getTimestamp("added_at").toInstant(),
                        SocialStore.instant(rs.getTimestamp("watched_at"))))
                .optional();
        if (tracked.isEmpty()) {
            db.sql("delete from activities where user_id = :user and title_id = :title")
                    .param("user", userId)
                    .param("title", titleId)
                    .update();
            return;
        }
        Tracked t = tracked.get();
        Instant now = clock.instant();
        ZoneId zone = zone(userId);
        if ("movie".equals(t.mediaType())) {
            boolean watched = "watched".equals(t.status()) && t.watchedAt() != null;
            boolean addedOtherDay = !watched || !day(t.addedAt(), zone).equals(day(t.watchedAt(), zone));
            once(userId, titleId, "added", addedOtherDay ? t.addedAt() : null, zone, now);
            once(userId, titleId, "watched_movie", watched ? t.watchedAt() : null, zone, now);
            return;
        }
        SeriesProgress progress = social.progress(List.of(userId), List.of(titleId), now)
                .getOrDefault(userId, Map.of())
                .get(titleId);
        once(userId, titleId, "added", t.addedAt(), zone, now);
        once(userId, titleId, "started_show",
                progress != null && progress.watched() > 0 ? progress.firstWatchedAt() : null, zone, now);
        once(userId, titleId, "finished_show",
                progress != null && progress.finished() ? progress.lastWatchedAt() : null, zone, now);
        episodesByDay(userId, titleId, zone, now);
    }

    /** Abonnement accepté : « suit maintenant ». {@code at} : date d'acceptation. */
    public void followed(UUID follower, UUID followee, Instant at) {
        ZoneId zone = zone(follower);
        db.sql("""
                insert into activities (user_id, type, target_user_id, activity_date, created_at, updated_at)
                values (:user, 'followed', :target, :day, :at, :at)
                on conflict (user_id, target_user_id) where type = 'followed'
                do update set activity_date = excluded.activity_date, created_at = excluded.created_at,
                  updated_at = excluded.updated_at
                """)
                .param("user", follower)
                .param("target", followee)
                .param("day", day(at, zone))
                .param("at", Timestamp.from(at))
                .update();
    }

    /** Abonnement supprimé (désabonnement, abonné retiré, blocage). */
    public void unfollowed(UUID follower, UUID followee) {
        db.sql("delete from activities where type = 'followed' and user_id = :user and target_user_id = :target")
                .param("user", follower)
                .param("target", followee)
                .update();
    }

    /** Rétention de 180 jours (tâche planifiée). */
    public int purge() {
        return db.sql("delete from activities where updated_at < :limit")
                .param("limit", Timestamp.from(clock.instant().minus(RETENTION)))
                .update();
    }

    // ─── Détail ───────────────────────────────────────────────────────────────

    /** Une activité d'un type donné par titre ; {@code at} nul ou trop ancien : supprimée. */
    private void once(UUID userId, long titleId, String type, Instant at, ZoneId zone, Instant now) {
        if (at == null || at.isBefore(now.minus(RETENTION))) {
            db.sql("delete from activities where user_id = :user and title_id = :title and type = :type")
                    .param("user", userId)
                    .param("title", titleId)
                    .param("type", type)
                    .update();
            return;
        }
        db.sql("""
                insert into activities (user_id, type, title_id, activity_date, created_at, updated_at)
                values (:user, :type, :title, :day, :at, :at)
                on conflict (user_id, title_id, type) where %s
                do update set activity_date = excluded.activity_date, created_at = excluded.created_at,
                  updated_at = excluded.updated_at
                where activities.updated_at is distinct from excluded.updated_at
                """.formatted(ONCE_TYPES))
                .param("user", userId)
                .param("type", type)
                .param("title", titleId)
                .param("day", day(at, zone))
                .param("at", Timestamp.from(at))
                .update();
    }

    /**
     * Une ligne {@code watched_episodes} par jour : nombre d'épisodes distincts vus ce jour-là,
     * l'épisode s'il est seul, première et dernière heure de visionnage.
     */
    private void episodesByDay(UUID userId, long titleId, ZoneId zone, Instant now) {
        Timestamp horizon = Timestamp.from(now.minus(RETENTION));
        db.sql("""
                insert into activities (user_id, type, title_id, episode_id, count, activity_date, created_at, updated_at)
                select :user, 'watched_episodes', :title, case when count(*) = 1 then min(x.id) end, count(*), x.day,
                  min(x.watched_at), max(x.watched_at)
                from (
                  select e.id, ue.watched_at, (ue.watched_at at time zone :tz)::date as day
                  from user_episodes ue join episodes e on e.id = ue.episode_id
                  where ue.user_id = :user and e.title_id = :title and ue.watched_at >= :horizon
                ) x
                group by x.day
                on conflict (user_id, title_id, activity_date) where type = 'watched_episodes'
                do update set episode_id = excluded.episode_id, count = excluded.count,
                  created_at = excluded.created_at, updated_at = excluded.updated_at
                where (activities.episode_id, activities.count, activities.updated_at)
                  is distinct from (excluded.episode_id, excluded.count, excluded.updated_at)
                """)
                .param("user", userId)
                .param("title", titleId)
                .param("tz", zone.getId())
                .param("horizon", horizon)
                .update();
        db.sql("""
                delete from activities a
                where a.type = 'watched_episodes' and a.user_id = :user and a.title_id = :title
                  and not exists (
                    select 1 from user_episodes ue join episodes e on e.id = ue.episode_id
                    where ue.user_id = :user and e.title_id = :title and ue.watched_at >= :horizon
                      and (ue.watched_at at time zone :tz)::date = a.activity_date)
                """)
                .param("user", userId)
                .param("title", titleId)
                .param("tz", zone.getId())
                .param("horizon", horizon)
                .update();
    }

    private ZoneId zone(UUID userId) {
        String id = db.sql("select timezone from profiles where id = :id")
                .param("id", userId)
                .query(String.class)
                .optional()
                .orElse("UTC");
        try {
            return ZoneId.of(id);
        } catch (Exception e) {
            return ZoneId.of("UTC");
        }
    }

    private static LocalDate day(Instant at, ZoneId zone) {
        return at.atZone(zone).toLocalDate();
    }
}
