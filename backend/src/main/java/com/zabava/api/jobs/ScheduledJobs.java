package com.zabava.api.jobs;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.zabava.api.catalog.TitleService;
import com.zabava.api.catalog.TitleStore;
import com.zabava.api.common.MediaType;
import com.zabava.api.common.TitleRef;
import com.zabava.api.me.ProfileService;
import com.zabava.api.notifications.NotificationService;
import com.zabava.api.notifications.SocialNotifications;
import com.zabava.api.social.ActivityService;
import com.zabava.api.social.UsernameService;

/**
 * Tâches planifiées (specs/docs/11 §4), en UTC. Actives seulement si
 * {@code zabava.jobs.enabled} (voir {@link SchedulingConfig}) ; les tests les appellent à la main.
 */
@Component
public class ScheduledJobs {

    private static final Logger log = LoggerFactory.getLogger(ScheduledJobs.class);
    /** Rechargées si plus anciennes : une tâche quotidienne ne doit pas sauter un jour. */
    static final Duration NIGHTLY_MAX_AGE = Duration.ofHours(20);
    /** Quota OMDb gratuit d'environ 1 000 appels par jour. */
    static final int RATINGS_BATCH = 900;

    /** Titre de la liste d'au moins un utilisateur, avec un utilisateur (langue, région). */
    record Tracked(long titleId, int tmdbId, String mediaType, boolean anime, UUID userId) {
        TitleRef ref() {
            return new TitleRef(MediaType.of(mediaType, anime), tmdbId);
        }
    }

    private final JdbcClient db;
    private final TitleService titles;
    private final TitleStore store;
    private final ProfileService profiles;
    private final NotificationService notifications;
    private final ActivityService activities;
    private final UsernameService usernames;
    private final SocialNotifications socialNotifications;

    public ScheduledJobs(JdbcClient db, TitleService titles, TitleStore store, ProfileService profiles,
            NotificationService notifications, ActivityService activities, UsernameService usernames,
            SocialNotifications socialNotifications) {
        this.db = db;
        this.titles = titles;
        this.store = store;
        this.profiles = profiles;
        this.notifications = notifications;
        this.activities = activities;
        this.usernames = usernames;
        this.socialNotifications = socialNotifications;
    }

    /** SyncEpisodesJob : saisons et épisodes (heures TVmaze comprises) des séries suivies. */
    @Scheduled(cron = "0 0 3 * * *", zone = "UTC")
    public int syncEpisodes() {
        return refresh(tracked("t.media_type = 'tv' and ut.status = 'following'"), true);
    }

    /** SyncAvailabilityJob : plateformes et dates de sortie des films de la watchlist. */
    @Scheduled(cron = "0 0 4 * * *", zone = "UTC")
    public int syncAvailability() {
        return refresh(tracked("t.media_type = 'movie' and ut.status = 'towatch'"), false);
    }

    /** RefreshRatingsJob : notes OMDb des titres en liste, les plus anciennes d'abord. */
    @Scheduled(cron = "0 0 5 * * MON", zone = "UTC")
    public int refreshRatings() {
        List<Long> ids = db.sql("""
                select t.id from titles t
                where exists (select 1 from user_titles ut where ut.title_id = t.id)
                order by t.ratings_updated_at asc nulls first
                limit :limit
                """)
                .param("limit", RATINGS_BATCH)
                .query(Long.class)
                .list();
        store.findByIds(ids).forEach(titles::refreshRatings);
        return ids.size();
    }

    /** Rétention du social : activités de plus de 180 jours, pseudos libérés, compteurs du jour. */
    @Scheduled(cron = "0 30 3 * * *", zone = "UTC")
    public int purgeSocial() {
        int purged = activities.purge() + usernames.purge() + socialNotifications.purge();
        db.sql("delete from follow_quota where day < current_date - 1").update();
        db.sql("delete from follow_removals where removed_at < now() - interval '1 day'").update();
        return purged;
    }

    /** DispatchNotificationsJob : toutes les 15 minutes. */
    @Scheduled(cron = "0 */15 * * * *", zone = "UTC")
    public int dispatchNotifications() {
        return notifications.dispatch();
    }

    private List<Tracked> tracked(String where) {
        return db.sql("""
                select distinct on (t.id) t.id, t.tmdb_id, t.media_type, t.is_anime, ut.user_id
                from user_titles ut join titles t on t.id = ut.title_id
                where %s
                order by t.id, ut.added_at
                """.formatted(where))
                .query((rs, n) -> new Tracked(
                        rs.getLong("id"),
                        rs.getInt("tmdb_id"),
                        rs.getString("media_type"),
                        rs.getBoolean("is_anime"),
                        rs.getObject("user_id", UUID.class)))
                .list();
    }

    /** Recharge chaque titre ; une source en panne pour un titre n'arrête pas les autres. */
    private int refresh(List<Tracked> tracked, boolean withEpisodes) {
        int done = 0;
        for (Tracked t : tracked) {
            try {
                titles.ensure(t.ref(), profiles.prefs(t.userId()), withEpisodes, NIGHTLY_MAX_AGE);
                done++;
            } catch (RuntimeException e) {
                log.warn("Synchronisation impossible pour {}", t.ref(), e);
            }
        }
        return done;
    }
}
