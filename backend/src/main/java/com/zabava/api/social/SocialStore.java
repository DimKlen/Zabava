package com.zabava.api.social;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Lectures sociales : profils, relations, titres en commun, avancement des séries. */
@Repository
public class SocialStore {

    /** Ligne de {@code profiles} utile au social. */
    public record ProfileRow(
            UUID id,
            String username,
            String displayName,
            String avatarUrl,
            boolean isPrivate,
            int followersCount,
            int followingCount) {}

    /**
     * Relation entre moi et un autre compte. {@code myStatus} : mon abonnement (null, pending,
     * accepted) ; {@code followsMe} : son abonnement accepté à moi.
     */
    public record Relation(String myStatus, boolean followsMe, boolean iBlocked, boolean blockedMe) {

        public boolean following() {
            return "accepted".equals(myStatus);
        }

        public boolean blockedEitherWay() {
            return iBlocked || blockedMe;
        }
    }

    /** Membre et sa relation avec moi, sans les titres en commun. */
    public record MemberRow(ProfileRow profile, String myStatus, boolean followsMe, boolean iBlocked) {}

    /** Titre de la liste d'un utilisateur. */
    public record ListRow(long titleId, String mediaType, String status, Instant addedAt, Instant watchedAt) {}

    /**
     * Titres « vus » au sens des titres en commun (specs/social/docs/01 §8) : film vu, ou série non
     * abandonnée avec au moins un épisode vu (hors spéciaux), parmi les lignes de {@code user_titles ut}
     * qui vérifient {@code filter}.
     */
    static String seen(String filter) {
        return """
            select ut.user_id, ut.title_id from user_titles ut join titles t on t.id = ut.title_id
            where %s and (
              (t.media_type = 'movie' and ut.status = 'watched')
              or (t.media_type = 'tv' and ut.status <> 'abandoned' and exists (
                select 1 from user_episodes ue join episodes e on e.id = ue.episode_id
                where ue.user_id = ut.user_id and e.title_id = ut.title_id and e.season_number > 0)))
            """.formatted(filter);
    }

    /** Aucun blocage, dans un sens ou dans l'autre, entre {@code :me} et la colonne donnée. */
    static String notBlocked(String column) {
        return """
                not exists (select 1 from blocks b where (b.blocker_id = :me and b.blocked_id = %1$s)
                  or (b.blocker_id = %1$s and b.blocked_id = :me))
                """.formatted(column);
    }

    private static final String PROFILE = """
            select p.id, p.username, p.display_name, p.avatar_url, p.is_private, p.followers_count, p.following_count
            from profiles p
            """;

    private final JdbcClient db;

    public SocialStore(JdbcClient db) {
        this.db = db;
    }

    // ─── Profils ──────────────────────────────────────────────────────────────

    /** Par pseudo actuel, ou par ancien pseudo encore réservé (les liens redirigent pendant 30 jours). */
    public Optional<ProfileRow> findByUsername(String raw, Instant now) {
        String username = raw.toLowerCase(Locale.ROOT);
        Optional<ProfileRow> current = db.sql(PROFILE + " where p.username = :u")
                .param("u", username)
                .query(SocialStore::profile)
                .optional();
        if (current.isPresent()) return current;
        return db.sql(PROFILE + """
                 join username_history h on h.user_id = p.id
                where h.username = :u and h.released_at > :now and p.username is not null
                """)
                .param("u", username)
                .param("now", Timestamp.from(now))
                .query(SocialStore::profile)
                .optional();
    }

    public ProfileRow profile(UUID id) {
        return db.sql(PROFILE + " where p.id = :id").param("id", id).query(SocialStore::profile).single();
    }

    public Relation relation(UUID me, UUID other) {
        return db.sql("""
                select
                  (select status from follows where follower_id = :me and followee_id = :other) as my_status,
                  exists (select 1 from follows where follower_id = :other and followee_id = :me
                          and status = 'accepted') as follows_me,
                  exists (select 1 from blocks where blocker_id = :me and blocked_id = :other) as i_blocked,
                  exists (select 1 from blocks where blocker_id = :other and blocked_id = :me) as blocked_me
                """)
                .param("me", me)
                .param("other", other)
                .query((rs, n) -> new Relation(
                        rs.getString("my_status"),
                        rs.getBoolean("follows_me"),
                        rs.getBoolean("i_blocked"),
                        rs.getBoolean("blocked_me")))
                .single();
    }

    /** Membres et leur relation avec moi, par identifiant. */
    public Map<UUID, MemberRow> members(UUID me, Collection<UUID> ids) {
        if (ids.isEmpty()) return Map.of();
        Map<UUID, MemberRow> result = new HashMap<>();
        db.sql("""
                select p.id, p.username, p.display_name, p.avatar_url, p.is_private, p.followers_count,
                  p.following_count, mine.status as my_status,
                  coalesce(theirs.status = 'accepted', false) as follows_me,
                  exists (select 1 from blocks b where b.blocker_id = :me and b.blocked_id = p.id) as i_blocked
                from profiles p
                left join follows mine on mine.follower_id = :me and mine.followee_id = p.id
                left join follows theirs on theirs.follower_id = p.id and theirs.followee_id = :me
                where p.id in (:ids)
                """)
                .param("me", me)
                .param("ids", ids)
                .query((rs, n) -> result.put(rs.getObject("id", UUID.class), new MemberRow(
                        profile(rs, n), rs.getString("my_status"), rs.getBoolean("follows_me"), rs.getBoolean("i_blocked"))))
                .list();
        return result;
    }

    /**
     * Nombre de titres vus en commun avec moi, par membre (absent = 0). Seulement pour les comptes
     * dont je peux voir les listes : public ou privé que je suis, sans blocage dans un sens ou dans
     * l'autre. Sinon, ce nombre révélerait une partie de leur liste.
     */
    public Map<UUID, Integer> commonCounts(UUID me, Collection<UUID> others) {
        if (others.isEmpty()) return Map.of();
        Map<UUID, Integer> result = new HashMap<>();
        db.sql("with seen as (" + seen("ut.user_id in (:users)") + """
                )
                select o.user_id, count(*) as n from seen o
                join seen m on m.title_id = o.title_id and m.user_id = :me
                join profiles p on p.id = o.user_id
                where o.user_id <> :me
                  and (not p.is_private or exists (select 1 from follows f
                    where f.follower_id = :me and f.followee_id = o.user_id and f.status = 'accepted'))
                  and %s
                group by o.user_id
                """.formatted(notBlocked("o.user_id")))
                .param("me", me)
                .param("users", union(me, others))
                .query((rs, n) -> result.put(rs.getObject("user_id", UUID.class), rs.getInt("n")))
                .list();
        return result;
    }

    // ─── Listes de titres ─────────────────────────────────────────────────────

    /** Titres de la liste d'un utilisateur, d'un type TMDB donné (movie ou tv). */
    public List<ListRow> list(UUID userId, String mediaType, Boolean anime) {
        return db.sql("""
                select ut.title_id, t.media_type, ut.status, ut.added_at, ut.watched_at
                from user_titles ut join titles t on t.id = ut.title_id
                where ut.user_id = :user and t.media_type = :type
                  and (cast(:anime as boolean) is null or t.is_anime = cast(:anime as boolean))
                """)
                .param("user", userId)
                .param("type", mediaType)
                .param("anime", anime)
                .query(SocialStore::listRow)
                .list();
    }

    /** Lignes de suivi de plusieurs utilisateurs pour un titre. */
    public Map<UUID, ListRow> holders(Collection<UUID> users, long titleId) {
        if (users.isEmpty()) return Map.of();
        Map<UUID, ListRow> result = new HashMap<>();
        db.sql("""
                select ut.user_id, ut.title_id, t.media_type, ut.status, ut.added_at, ut.watched_at
                from user_titles ut join titles t on t.id = ut.title_id
                where ut.title_id = :title and ut.user_id in (:users)
                """)
                .param("title", titleId)
                .param("users", users)
                .query((rs, n) -> result.put(rs.getObject("user_id", UUID.class), listRow(rs, n)))
                .list();
        return result;
    }

    /** Titres de ma liste parmi ceux donnés (coche « dans ma liste »). */
    public Set<Long> inList(UUID me, Collection<Long> titleIds) {
        if (titleIds.isEmpty()) return Set.of();
        return new HashSet<>(db.sql("select title_id from user_titles where user_id = :me and title_id in (:ids)")
                .param("me", me)
                .param("ids", titleIds)
                .query(Long.class)
                .list());
    }

    /**
     * Avancement dans les séries données, par utilisateur puis par titre. Diffusé = instant
     * TVmaze, sinon jour de diffusion (minuit UTC), passé à {@code now}.
     */
    public Map<UUID, Map<Long, SeriesProgress>> progress(Collection<UUID> users, Collection<Long> titleIds, Instant now) {
        if (users.isEmpty() || titleIds.isEmpty()) return Map.of();
        Map<UUID, Map<Long, SeriesProgress>> result = new HashMap<>();
        db.sql("""
                with eps as (
                  select ut.user_id, ut.title_id, ut.status, t.ended, e.season_number, e.episode_number,
                    coalesce(e.airstamp, e.air_date::timestamp at time zone 'UTC') <= :now as aired,
                    ue.watched_at
                  from user_titles ut
                  join titles t on t.id = ut.title_id
                  left join episodes e on e.title_id = ut.title_id and e.season_number > 0
                  left join user_episodes ue on ue.episode_id = e.id and ue.user_id = ut.user_id
                  where ut.user_id in (:users) and ut.title_id in (:titles)
                ),
                last_seen as (
                  select distinct on (user_id, title_id) user_id, title_id, season_number, episode_number
                  from eps where aired and watched_at is not null
                  order by user_id, title_id, season_number desc, episode_number desc
                )
                select g.*, l.season_number as last_season, l.episode_number as last_number
                from (
                  select user_id, title_id, status, ended,
                    count(season_number) filter (where aired) as aired,
                    count(watched_at) filter (where aired) as aired_watched,
                    count(watched_at) as watched,
                    min(watched_at) as first_watched_at,
                    max(watched_at) as last_watched_at
                  from eps group by user_id, title_id, status, ended
                ) g
                left join last_seen l on l.user_id = g.user_id and l.title_id = g.title_id
                """)
                .param("users", users)
                .param("titles", titleIds)
                .param("now", Timestamp.from(now))
                .query((rs, n) -> result
                        .computeIfAbsent(rs.getObject("user_id", UUID.class), k -> new HashMap<>())
                        .put(rs.getLong("title_id"), new SeriesProgress(
                                rs.getString("status"),
                                (Boolean) rs.getObject("ended"),
                                rs.getInt("aired"),
                                rs.getInt("aired_watched"),
                                rs.getInt("watched"),
                                instant(rs.getTimestamp("first_watched_at")),
                                instant(rs.getTimestamp("last_watched_at")),
                                (Integer) rs.getObject("last_season"),
                                (Integer) rs.getObject("last_number"))))
                .list();
        return result;
    }

    // ─── Outils ───────────────────────────────────────────────────────────────

    static ProfileRow profile(ResultSet rs, int n) throws SQLException {
        return new ProfileRow(
                rs.getObject("id", UUID.class),
                rs.getString("username"),
                rs.getString("display_name"),
                rs.getString("avatar_url"),
                rs.getBoolean("is_private"),
                rs.getInt("followers_count"),
                rs.getInt("following_count"));
    }

    private static ListRow listRow(ResultSet rs, int n) throws SQLException {
        return new ListRow(
                rs.getLong("title_id"),
                rs.getString("media_type"),
                rs.getString("status"),
                rs.getTimestamp("added_at").toInstant(),
                instant(rs.getTimestamp("watched_at")));
    }

    static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }

    private static List<UUID> union(UUID me, Collection<UUID> others) {
        List<UUID> all = new ArrayList<>(others);
        all.add(me);
        return all;
    }
}
