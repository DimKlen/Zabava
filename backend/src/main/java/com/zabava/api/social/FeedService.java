package com.zabava.api.social;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.zabava.api.catalog.TitleService;
import com.zabava.api.catalog.TitleStore;
import com.zabava.api.catalog.TitleStore.EpisodeRow;
import com.zabava.api.catalog.TitleStore.TitleRow;
import com.zabava.api.common.MediaType;
import com.zabava.api.social.SocialStore.ListRow;
import com.zabava.api.social.dto.SocialDtos.Activity;
import com.zabava.api.social.dto.SocialDtos.ActivityEpisode;
import com.zabava.api.social.dto.SocialDtos.FollowingStatus;
import com.zabava.api.social.dto.SocialDtos.MemberLite;
import com.zabava.api.social.dto.SocialDtos.Page;
import com.zabava.api.social.dto.SocialDtos.TitleSocial;

/** Fil d'activité et blocs sociaux des fiches (specs/social/docs/04 §4.9 et §4.11). */
@Service
public class FeedService {

    static final int FEED_PAGE = 30;
    static final int FEED_MAX = 50;
    static final int SAW_MAX = 10;

    private record Row(long id, UUID userId, String type, Long titleId, Long episodeId, UUID targetId, int count,
            Instant updatedAt) {}

    private final JdbcClient db;
    private final SocialStore store;
    private final TitleStore titles;
    private final Members members;
    private final Clock clock;

    public FeedService(JdbcClient db, SocialStore store, TitleStore titles, Members members, Clock clock) {
        this.db = db;
        this.store = store;
        this.titles = titles;
        this.members = members;
        this.clock = clock;
    }

    // ─── Fil ──────────────────────────────────────────────────────────────────

    /**
     * Activités de mes amis, plus récentes d'abord, sans les
     * comptes bloqués dans un sens ou dans l'autre (auteur ou personne suivie).
     */
    public Page<Activity> feed(UUID me, String cursor, Integer limit) {
        int size = limit == null ? FEED_PAGE : Math.clamp(limit, 1, FEED_MAX);
        Cursors.FeedPosition after = Cursors.feed(cursor);
        List<Row> rows = db.sql("""
                select a.id, a.user_id, a.type, a.title_id, a.episode_id, a.target_user_id, a.count, a.updated_at
                from activities a
                join follows f on f.follower_id = :me and f.followee_id = a.user_id and f.status = 'accepted'
                where %s
                  and (a.target_user_id is null or %s)
                  and (cast(:at as timestamptz) is null or (a.updated_at, a.id) < (cast(:at as timestamptz), :id))
                order by a.updated_at desc, a.id desc
                limit :limit
                """.formatted(SocialStore.notBlocked("a.user_id"), SocialStore.notBlocked("a.target_user_id")))
                .param("me", me)
                .param("at", after == null ? null : Timestamp.from(after.at()))
                .param("id", after == null ? 0 : after.id())
                .param("limit", size + 1)
                .query((rs, n) -> new Row(
                        rs.getLong("id"),
                        rs.getObject("user_id", UUID.class),
                        rs.getString("type"),
                        (Long) rs.getObject("title_id"),
                        (Long) rs.getObject("episode_id"),
                        rs.getObject("target_user_id", UUID.class),
                        rs.getInt("count"),
                        rs.getTimestamp("updated_at").toInstant()))
                .list();
        boolean more = rows.size() > size;
        List<Row> shown = more ? rows.subList(0, size) : rows;

        List<Long> titleIds = shown.stream().map(Row::titleId).filter(Objects::nonNull).distinct().toList();
        Map<Long, TitleRow> byTitle = titles.findByIds(titleIds).stream()
                .collect(Collectors.toMap(TitleRow::id, Function.identity()));
        Map<Long, EpisodeRow> byEpisode = titles.episodesByIds(
                        shown.stream().map(Row::episodeId).filter(Objects::nonNull).distinct().toList())
                .stream()
                .collect(Collectors.toMap(EpisodeRow::id, Function.identity()));
        Map<UUID, MemberLite> people = members.byId(me,
                shown.stream().flatMap(r -> Stream.of(r.userId(), r.targetId())).filter(Objects::nonNull).toList());
        Set<Long> mine = store.inList(me, titleIds);

        List<Activity> items = new ArrayList<>();
        for (Row r : shown) {
            MemberLite actor = people.get(r.userId());
            MemberLite target = r.targetId() == null ? null : people.get(r.targetId());
            TitleRow title = r.titleId() == null ? null : byTitle.get(r.titleId());
            // Compte sans pseudo, ou titre supprimé du cache : rien à afficher.
            if (actor == null || (r.targetId() != null && target == null) || (r.titleId() != null && title == null)) {
                continue;
            }
            EpisodeRow e = r.episodeId() == null ? null : byEpisode.get(r.episodeId());
            items.add(new Activity(
                    Long.toString(r.id()),
                    r.updatedAt(),
                    actor,
                    r.type(),
                    title == null ? null : TitleService.lite(title),
                    e == null ? null : new ActivityEpisode(e.id(), e.season(), e.number(), e.name(), e.stillPath()),
                    r.count(),
                    target,
                    title != null && mine.contains(title.id())));
        }
        Row last = shown.isEmpty() ? null : shown.getLast();
        return new Page<>(items, more ? Cursors.feed(last.updatedAt(), last.id()) : null);
    }

    // ─── Fiches ───────────────────────────────────────────────────────────────

    /** Mes amis qui ont ce titre, quel que soit son statut, dernière action d'abord. */
    public TitleSocial titleSocial(UUID me, String type, int tmdbId) {
        MediaType mediaType = MediaType.parse(type);
        TitleRow title = titles.find(mediaType.tmdbType(), tmdbId).orElse(null);
        if (title == null) return new TitleSocial(List.of());
        return new TitleSocial(following(me, title));
    }

    private List<FollowingStatus> following(UUID me, TitleRow title) {
        List<UUID> followees = db.sql("""
                select f.followee_id from follows f
                join user_titles ut on ut.user_id = f.followee_id and ut.title_id = :title
                where f.follower_id = :me and f.status = 'accepted' and %s
                """.formatted(SocialStore.notBlocked("f.followee_id")))
                .param("me", me)
                .param("title", title.id())
                .query(UUID.class)
                .list();
        return statuses(me, followees, title).stream()
                .sorted(Comparator.comparing(FollowingStatus::date).reversed()
                        .thenComparing(status -> status.user().username()))
                .toList();
    }

    /**
     * Statut de chaque compte sur le titre : film watched (date de visionnage) ou towatch ; série
     * in_progress (« S02 E05 »), finished, abandoned ou towatch (date de la dernière action).
     */
    private List<FollowingStatus> statuses(UUID me, List<UUID> users, TitleRow title) {
        if (users.isEmpty()) return List.of();
        Map<UUID, ListRow> rows = store.holders(users, title.id());
        boolean series = title.type().isSeries();
        Map<UUID, Map<Long, SeriesProgress>> progress = series
                ? store.progress(users, List.of(title.id()), clock.instant())
                : Map.of();
        Map<UUID, MemberLite> people = members.byId(me, users);

        List<FollowingStatus> result = new ArrayList<>();
        for (UUID id : users) {
            MemberLite user = people.get(id);
            ListRow row = rows.get(id);
            if (user == null || row == null) continue;
            if (!series) {
                boolean watched = "watched".equals(row.status()) && row.watchedAt() != null;
                result.add(new FollowingStatus(user, watched ? "watched" : "towatch", null,
                        watched ? row.watchedAt() : row.addedAt()));
                continue;
            }
            SeriesProgress p = progress.getOrDefault(id, Map.of()).get(title.id());
            String bucket = p == null ? "towatch" : p.bucket();
            Instant last = p == null || p.lastWatchedAt() == null || p.lastWatchedAt().isBefore(row.addedAt())
                    ? row.addedAt() : p.lastWatchedAt();
            result.add(new FollowingStatus(user, bucket, "in_progress".equals(bucket) ? p.lastCode() : null, last));
        }
        return result;
    }
}
