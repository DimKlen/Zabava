package com.zabava.api.social;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zabava.api.catalog.TitleService;
import com.zabava.api.catalog.TitleStore;
import com.zabava.api.catalog.TitleStore.TitleRow;
import com.zabava.api.common.ApiException;
import com.zabava.api.common.MediaType;
import com.zabava.api.social.SocialStore.ListRow;
import com.zabava.api.social.SocialStore.ProfileRow;
import com.zabava.api.social.SocialStore.Relation;
import com.zabava.api.social.dto.SocialDtos.EpisodeCode;
import com.zabava.api.social.dto.SocialDtos.MemberLite;
import com.zabava.api.social.dto.SocialDtos.Page;
import com.zabava.api.social.dto.SocialDtos.ProfileTitle;
import com.zabava.api.social.dto.SocialDtos.UserProfile;

/**
 * Profils des membres : en-tête, listes de titres, amis, recherche,
 * profils visités. Règles de visibilité : specs/social/docs/01 §3 et §5.
 */
@Service
public class UserService {

    static final int TITLES_PAGE = 30;
    static final int CONNECTIONS_PAGE = 50;
    static final int SEARCH_PAGE = 20;
    static final int RECENT_PROFILES = 5;

    private static final Set<String> MOVIE_STATUSES = Set.of("towatch", "watched");
    private static final Set<String> SERIES_STATUSES = Set.of("in_progress", "finished", "towatch");

    private final JdbcClient db;
    private final SocialStore store;
    private final TitleStore titles;
    private final Members members;
    private final Clock clock;

    public UserService(JdbcClient db, SocialStore store, TitleStore titles, Members members, Clock clock) {
        this.db = db;
        this.store = store;
        this.titles = titles;
        this.members = members;
        this.clock = clock;
    }

    /** Ce que je vois d'un profil ; {@code 404} s'il n'existe pas ou s'il m'a bloqué. */
    record Viewed(ProfileRow profile, Relation relation, boolean isMe) {

        /** Listes, amis et activité visibles : moi, ou un ami que je n'ai pas bloqué. */
        boolean canSeeLists() {
            return isMe || (!relation.iBlocked() && relation.following());
        }
    }

    Viewed view(UUID me, String username) {
        ProfileRow profile = store.findByUsername(username)
                .orElseThrow(() -> ApiException.notFound("Profil introuvable"));
        if (profile.id().equals(me)) return new Viewed(profile, new Relation(null, false, false, false), true);
        Relation relation = store.relation(me, profile.id());
        if (relation.blockedMe()) throw ApiException.notFound("Profil introuvable");
        return new Viewed(profile, relation, false);
    }

    public UserProfile profile(UUID me, String username) {
        Viewed v = view(me, username);
        MemberLite m = members.byId(me, List.of(v.profile().id())).get(v.profile().id());
        return new UserProfile(
                m.username(),
                m.displayName(),
                m.avatarUrl(),
                m.followState(),
                m.followsMe(),
                m.commonCount(),
                v.profile().friendsCount(),
                v.canSeeLists(),
                v.isMe());
    }

    // ─── Listes de titres ─────────────────────────────────────────────────────

    /**
     * Films : towatch (ajout récent d'abord) ou watched (visionnage récent d'abord). Séries et
     * animés : in_progress, finished (dernier visionnage d'abord) ou towatch (ajout récent d'abord) ;
     * les séries abandonnées ne sont jamais montrées.
     */
    public Page<ProfileTitle> titles(UUID me, String username, String type, String status, String cursor) {
        Viewed v = readable(me, username);
        MediaType mediaType = MediaType.parse(type);
        Set<String> allowed = mediaType.isSeries() ? SERIES_STATUSES : MOVIE_STATUSES;
        if (!allowed.contains(status)) {
            throw ApiException.badRequest("Statut « " + status + " » impossible pour le type " + type);
        }
        UUID owner = v.profile().id();
        List<ListRow> rows = store.list(owner, mediaType.tmdbType(), mediaType.isSeries() ? mediaType == MediaType.ANIME : null);
        Instant now = clock.instant();

        record Entry(ListRow row, SeriesProgress progress, Instant sortKey) {}
        List<Entry> entries;
        if (mediaType.isSeries()) {
            Map<Long, SeriesProgress> progress = store
                    .progress(List.of(owner), rows.stream().map(ListRow::titleId).toList(), now)
                    .getOrDefault(owner, Map.of());
            entries = rows.stream()
                    .map(r -> {
                        SeriesProgress p = progress.get(r.titleId());
                        Instant key = "towatch".equals(status) || p == null || p.lastWatchedAt() == null
                                ? r.addedAt() : p.lastWatchedAt();
                        return new Entry(r, p, key);
                    })
                    .filter(e -> e.progress() != null && status.equals(e.progress().bucket()))
                    .toList();
        } else {
            entries = rows.stream()
                    .filter(r -> status.equals(r.status()))
                    .map(r -> new Entry(r, null, "watched".equals(status) && r.watchedAt() != null ? r.watchedAt() : r.addedAt()))
                    .toList();
        }
        entries = entries.stream()
                .sorted(Comparator.comparing(Entry::sortKey).reversed().thenComparing(e -> e.row().titleId()))
                .toList();

        int offset = Cursors.offset(cursor);
        List<Entry> shown = entries.stream().skip(offset).limit(TITLES_PAGE).toList();
        List<Long> ids = shown.stream().map(e -> e.row().titleId()).toList();
        Map<Long, TitleRow> byId = titles.findByIds(ids).stream().collect(Collectors.toMap(TitleRow::id, Function.identity()));
        Set<Long> mine = store.inList(me, ids);
        List<ProfileTitle> items = shown.stream()
                .map(e -> {
                    SeriesProgress p = e.progress();
                    boolean inProgress = p != null && "in_progress".equals(status);
                    return new ProfileTitle(
                            TitleService.lite(byId.get(e.row().titleId())),
                            status,
                            inProgress && p.lastSeason() != null ? new EpisodeCode(p.lastSeason(), p.lastNumber()) : null,
                            inProgress ? p.progressPct() : null,
                            mine.contains(e.row().titleId()));
                })
                .toList();
        boolean more = offset + TITLES_PAGE < entries.size();
        return new Page<>(items, more ? Cursors.offset(offset + TITLES_PAGE) : null);
    }

    // ─── Amis ─────────────────────────────────────────────────────────────────

    /**
     * Amis d'un profil, plus récents d'abord. Les comptes bloqués avec moi (dans un sens ou dans
     * l'autre) sont masqués. Filtre {@code q} sur le pseudo et le nom, sans accents ni casse.
     */
    public Page<MemberLite> friends(UUID me, String username, String q, String cursor) {
        Viewed v = readable(me, username);
        String query = Usernames.searchQuery(q);
        int offset = Cursors.offset(cursor);
        List<UUID> ids = db.sql("""
                select f.followee_id from follows f join profiles p on p.id = f.followee_id
                where f.follower_id = :user and f.status = 'accepted' and p.username is not null and %s
                  and (:q = '' or strpos(lower(extensions.unaccent(p.username || ' ' || coalesce(p.display_name, ''))), :q) > 0)
                order by f.accepted_at desc, f.followee_id
                limit :limit offset :offset
                """.formatted(SocialStore.notBlocked("f.followee_id")))
                .param("user", v.profile().id())
                .param("me", me)
                .param("q", query)
                .param("limit", CONNECTIONS_PAGE + 1)
                .param("offset", offset)
                .query(UUID.class)
                .list();
        return page(me, ids, offset, CONNECTIONS_PAGE);
    }

    // ─── Recherche ────────────────────────────────────────────────────────────

    /**
     * Préfixe du pseudo, du nom ou d'un mot du nom, à partir de 2 caractères. Ordre :
     * pseudo exact, puis nombre d'amis en commun, puis nombre d'amis.
     */
    public Page<MemberLite> search(UUID me, String q, String cursor) {
        String query = Usernames.searchQuery(q);
        if (query.length() < 2) return new Page<>(List.of(), null);
        int offset = Cursors.offset(cursor);
        List<UUID> ids = db.sql("""
                select p.id from profiles p
                where p.username is not null and p.id <> :me and %s
                  and (starts_with(p.username, :q)
                    or strpos(' ' || lower(extensions.unaccent(coalesce(p.display_name, ''))), ' ' || :q) > 0)
                order by (p.username = :q) desc,
                  (select count(*) from follows mine join follows theirs
                     on theirs.follower_id = mine.followee_id and theirs.followee_id = p.id and theirs.status = 'accepted'
                   where mine.follower_id = :me and mine.status = 'accepted') desc,
                  p.followers_count desc, p.username
                limit :limit offset :offset
                """.formatted(SocialStore.notBlocked("p.id")))
                .param("me", me)
                .param("q", query)
                .param("limit", SEARCH_PAGE + 1)
                .param("offset", offset)
                .query(UUID.class)
                .list();
        return page(me, ids, offset, SEARCH_PAGE);
    }

    // ─── Profils visités ──────────────────────────────────────────────────────

    public List<MemberLite> recentProfiles(UUID me) {
        List<UUID> ids = db.sql("""
                select v.visited_id from recent_profile_visits v
                where v.user_id = :me and %s
                order by v.visited_at desc
                limit :limit
                """.formatted(SocialStore.notBlocked("v.visited_id")))
                .param("me", me)
                .param("limit", RECENT_PROFILES)
                .query(UUID.class)
                .list();
        return members.of(me, ids);
    }

    /** Met le profil en tête des « Personnes suivies récemment » (5 au plus, sans doublon). */
    @Transactional
    public List<MemberLite> visit(UUID me, String username) {
        Viewed v = view(me, username);
        if (!v.isMe()) {
            db.sql("""
                    insert into recent_profile_visits (user_id, visited_id, visited_at) values (:me, :id, :now)
                    on conflict (user_id, visited_id) do update set visited_at = excluded.visited_at
                    """)
                    .param("me", me)
                    .param("id", v.profile().id())
                    .param("now", Timestamp.from(clock.instant()))
                    .update();
            db.sql("""
                    delete from recent_profile_visits where user_id = :me and visited_id not in (
                      select visited_id from recent_profile_visits where user_id = :me
                      order by visited_at desc limit :limit)
                    """)
                    .param("me", me)
                    .param("limit", RECENT_PROFILES)
                    .update();
        }
        return recentProfiles(me);
    }

    // ─── Détail ───────────────────────────────────────────────────────────────

    /** Profil dont je peux voir les listes ; {@code 403} s'il est privé non suivi ou si je l'ai bloqué. */
    private Viewed readable(UUID me, String username) {
        Viewed v = view(me, username);
        if (!v.canSeeLists()) {
            throw v.relation().iBlocked()
                    ? new ApiException(HttpStatus.FORBIDDEN, "blocked", "Tu as bloqué ce profil")
                    : new ApiException(HttpStatus.FORBIDDEN, "private_profile", "Ce profil est privé");
        }
        return v;
    }

    private Page<MemberLite> page(UUID me, List<UUID> ids, int offset, int size) {
        boolean more = ids.size() > size;
        List<UUID> shown = more ? ids.subList(0, size) : ids;
        return new Page<>(members.of(me, shown), more ? Cursors.offset(offset + size) : null);
    }
}
