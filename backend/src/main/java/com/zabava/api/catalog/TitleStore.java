package com.zabava.api.catalog;

import java.sql.Array;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.zabava.api.catalog.dto.CatalogDtos.Availability;
import com.zabava.api.catalog.dto.CatalogDtos.Provider;
import com.zabava.api.common.MediaType;
import com.zabava.api.omdb.OmdbClient.Ratings;

/** Cache en base des titres consultés (titles, seasons, episodes, release_dates, title_availability). */
@Repository
public class TitleStore {

    /** Ligne de {@code titles}, telle que stockée. */
    public record TitleRow(
            long id,
            int tmdbId,
            String mediaType,
            boolean anime,
            String imdbId,
            Integer tvmazeId,
            String title,
            String originalTitle,
            String overview,
            String posterPath,
            String backdropPath,
            List<String> genres,
            String status,
            Boolean ended,
            String network,
            Integer runtime,
            Double imdbRating,
            Integer imdbVotes,
            Integer rtScore,
            Instant ratingsUpdatedAt,
            Integer year,
            Instant updatedAt) {

        public MediaType type() {
            return MediaType.of(mediaType, anime);
        }
    }

    public record TitleData(
            int tmdbId,
            String mediaType,
            boolean anime,
            String imdbId,
            String title,
            String originalTitle,
            String overview,
            String posterPath,
            String backdropPath,
            List<String> genres,
            String status,
            Boolean ended,
            String network,
            Integer runtime,
            String originalLanguage,
            String originCountry,
            String studio,
            String certification,
            Integer collectionId,
            String trailerKey,
            Double popularity,
            Integer year) {}

    public record ReleaseDate(String region, String type, LocalDate date) {}

    public record Offer(String region, int providerId, String type, String link) {}

    public record ProviderData(int id, String name, String shortName, String logoPath, Integer displayPriority) {}

    /** Arrivée en abonnement détectée ({@code first_seen_at}). */
    public record Arrival(long titleId, int providerId, String providerName, Instant firstSeen) {}

    public record SeasonData(int number, String name, Integer episodeCount, LocalDate airDate, String posterPath) {}

    public record EpisodeData(
            int season,
            int number,
            String name,
            String overview,
            String stillPath,
            LocalDate airDate,
            Instant airstamp,
            Integer runtime) {}

    public record EpisodeRow(
            long id,
            long titleId,
            int season,
            int number,
            String name,
            String overview,
            String stillPath,
            LocalDate airDate,
            Instant airstamp,
            Integer runtime,
            Double imdbRating) {}

    private final JdbcClient db;

    public TitleStore(JdbcClient db) {
        this.db = db;
    }

    // ─── Titres ───────────────────────────────────────────────────────────────

    public Optional<TitleRow> find(String mediaType, int tmdbId) {
        return db.sql(TITLE_SELECT + " where media_type = :type and tmdb_id = :tmdb")
                .param("type", mediaType)
                .param("tmdb", tmdbId)
                .query(TitleStore::titleRow)
                .optional();
    }

    public Optional<TitleRow> findById(long id) {
        return db.sql(TITLE_SELECT + " where id = :id").param("id", id).query(TitleStore::titleRow).optional();
    }

    public List<TitleRow> findByIds(Collection<Long> ids) {
        if (ids.isEmpty()) return List.of();
        return db.sql(TITLE_SELECT + " where id in (:ids)").param("ids", ids).query(TitleStore::titleRow).list();
    }

    /** Résultat d'un upsert : id et création (vs mise à jour). */
    public record Upserted(long id, boolean created) {}

    /** Insère ou met à jour la fiche. */
    @Transactional
    public Upserted upsert(TitleData t) {
        return db.sql("""
                insert into titles (tmdb_id, media_type, is_anime, imdb_id, title, original_title, overview,
                  poster_path, backdrop_path, genres, status, ended, network, runtime, original_language,
                  origin_country, studio, certification, collection_id, trailer_key, popularity, updated_at)
                values (:tmdb, :type, :anime, :imdb, :title, :original, :overview, :poster, :backdrop,
                  :genres, :status, :ended, :network, :runtime, :language, :country, :studio, :cert,
                  :collection, :trailer, :popularity, now())
                on conflict (media_type, tmdb_id) do update set
                  is_anime = excluded.is_anime, imdb_id = coalesce(excluded.imdb_id, titles.imdb_id),
                  title = excluded.title, original_title = excluded.original_title,
                  overview = excluded.overview, poster_path = excluded.poster_path,
                  backdrop_path = excluded.backdrop_path, genres = excluded.genres,
                  status = excluded.status, ended = excluded.ended, network = excluded.network,
                  runtime = excluded.runtime, original_language = excluded.original_language,
                  origin_country = excluded.origin_country, studio = excluded.studio,
                  certification = excluded.certification, collection_id = excluded.collection_id,
                  trailer_key = excluded.trailer_key, popularity = excluded.popularity, updated_at = now()
                returning id, (xmax = 0) as created
                """)
                .param("tmdb", t.tmdbId())
                .param("type", t.mediaType())
                .param("anime", t.anime())
                .param("imdb", t.imdbId())
                .param("title", t.title())
                .param("original", t.originalTitle())
                .param("overview", t.overview())
                .param("poster", t.posterPath())
                .param("backdrop", t.backdropPath())
                .param("genres", t.genres().toArray(String[]::new))
                .param("status", t.status())
                .param("ended", t.ended())
                .param("network", t.network())
                .param("runtime", t.runtime())
                .param("language", t.originalLanguage())
                .param("country", t.originCountry())
                .param("studio", t.studio())
                .param("cert", t.certification())
                .param("collection", t.collectionId())
                .param("trailer", t.trailerKey())
                .param("popularity", t.popularity())
                .query((rs, n) -> new Upserted(rs.getLong("id"), rs.getBoolean("created")))
                .single();
    }

    public void updateRatings(long titleId, Ratings ratings) {
        db.sql("""
                update titles set imdb_rating = :rating, imdb_votes = :votes, rt_score = :rt,
                  ratings_updated_at = now() where id = :id
                """)
                .param("rating", ratings.imdbRating())
                .param("votes", ratings.imdbVotes())
                .param("rt", ratings.rtScore())
                .param("id", titleId)
                .update();
    }

    public void setTvmazeId(long titleId, int tvmazeId) {
        db.sql("update titles set tvmaze_id = :tvmaze where id = :id")
                .param("tvmaze", tvmazeId)
                .param("id", titleId)
                .update();
    }

    // ─── Dates de sortie et disponibilité ─────────────────────────────────────

    /** Deux requêtes quel que soit le nombre de dates : chaque aller-retour vers la base compte. */
    @Transactional
    public void replaceReleaseDates(long titleId, List<ReleaseDate> dates) {
        db.sql("delete from release_dates where title_id = :id").param("id", titleId).update();
        if (dates.isEmpty()) return;
        db.sql("""
                insert into release_dates (title_id, region, type, date)
                select :id, d.region, d.type, cast(d.date as date)
                from unnest(cast(:regions as text[]), cast(:types as text[]), cast(:dates as text[]))
                  as d(region, type, date)
                on conflict do nothing
                """)
                .param("id", titleId)
                .param("regions", dates.stream().map(ReleaseDate::region).toArray(String[]::new))
                .param("types", dates.stream().map(ReleaseDate::type).toArray(String[]::new))
                .param("dates", dates.stream().map(d -> d.date().toString()).toArray(String[]::new))
                .update();
    }

    /** Date de sortie {@code type} (salle, numerique) d'un titre dans une région. */
    public Map<Long, Map<String, LocalDate>> releaseDates(Collection<Long> titleIds, String region) {
        if (titleIds.isEmpty()) return Map.of();
        return db.sql("select title_id, type, date from release_dates where title_id in (:ids) and region = :region")
                .param("ids", titleIds)
                .param("region", region)
                .query((rs, n) -> Map.entry(rs.getLong("title_id"), Map.entry(rs.getString("type"), rs.getDate("date").toLocalDate())))
                .list()
                .stream()
                .collect(Collectors.groupingBy(
                        Map.Entry::getKey,
                        Collectors.toMap(e -> e.getValue().getKey(), e -> e.getValue().getValue(), (a, b) -> a)));
    }

    /** {@code first_seen_at} des offres déjà présentes quand le titre entre en base : « depuis toujours ». */
    static final Instant KNOWN_BEFORE_TRACKING = Instant.EPOCH;

    /**
     * Remplace les offres des régions présentes dans {@code offers}, en gardant
     * {@code first_seen_at} des offres déjà connues (arrivées en streaming, notifications).
     * Au premier enregistrement du titre, les offres existantes ne sont pas des arrivées.
     */
    @Transactional
    public void replaceOffers(long titleId, Set<String> regions, List<Offer> offers, boolean firstSync) {
        if (regions.isEmpty()) return;
        // Une offre en double ferait échouer l'insertion groupée (« cannot affect row a second time »).
        List<Offer> unique = distinct(offers, o -> o.region() + ":" + o.providerId() + ":" + o.type());
        String[] offerRegions = unique.stream().map(Offer::region).toArray(String[]::new);
        Integer[] providers = unique.stream().map(Offer::providerId).toArray(Integer[]::new);
        String[] types = unique.stream().map(Offer::type).toArray(String[]::new);
        db.sql("""
                delete from title_availability a
                where a.title_id = :id and a.region = any (cast(:regions as text[]))
                  and not exists (
                    select 1
                    from unnest(cast(:offerRegions as text[]), cast(:providers as int[]), cast(:types as text[]))
                      as o(region, provider_id, type)
                    where o.region = a.region and o.provider_id = a.provider_id and o.type = a.type)
                """)
                .param("id", titleId)
                .param("regions", regions.toArray(String[]::new))
                .param("offerRegions", offerRegions)
                .param("providers", providers)
                .param("types", types)
                .update();
        if (unique.isEmpty()) return;
        db.sql("""
                insert into title_availability (title_id, region, provider_id, type, link, first_seen_at)
                select :id, o.region, o.provider_id, o.type, o.link, coalesce(cast(:seen as timestamptz), now())
                from unnest(cast(:offerRegions as text[]), cast(:providers as int[]), cast(:types as text[]),
                  cast(:links as text[])) as o(region, provider_id, type, link)
                on conflict (title_id, region, provider_id, type) do update set link = excluded.link
                """)
                .param("seen", firstSync ? Timestamp.from(KNOWN_BEFORE_TRACKING) : null)
                .param("id", titleId)
                .param("offerRegions", offerRegions)
                .param("providers", providers)
                .param("types", types)
                .param("links", unique.stream().map(Offer::link).toArray(String[]::new))
                .update();
    }

    /** Plateformes rencontrées dans les offres : nom et logo pour Ma liste et À venir. */
    public void upsertProviders(Collection<ProviderData> providers) {
        if (providers.isEmpty()) return;
        db.sql("""
                insert into providers (id, name, short, logo_path, display_priority)
                select * from unnest(cast(:ids as int[]), cast(:names as text[]), cast(:shorts as text[]),
                  cast(:logos as text[]), cast(:priorities as int[]))
                on conflict (id) do update set name = excluded.name, logo_path = excluded.logo_path,
                  short = coalesce(providers.short, excluded.short)
                """)
                .param("ids", providers.stream().map(ProviderData::id).toArray(Integer[]::new))
                .param("names", providers.stream().map(ProviderData::name).toArray(String[]::new))
                .param("shorts", providers.stream().map(ProviderData::shortName).toArray(String[]::new))
                .param("logos", providers.stream().map(ProviderData::logoPath).toArray(String[]::new))
                .param("priorities", providers.stream().map(ProviderData::displayPriority).toArray(Integer[]::new))
                .update();
    }

    /** Offres d'une région pour plusieurs titres, avec le nom et le logo des plateformes. */
    public Map<Long, Availability> offers(Collection<Long> titleIds, String region) {
        if (titleIds.isEmpty()) return Map.of();
        record Line(long titleId, String type, Provider provider) {}
        List<Line> lines = db.sql("""
                select a.title_id, a.type, a.provider_id, a.link, p.name, p.short, p.logo_path
                from title_availability a left join providers p on p.id = a.provider_id
                where a.title_id in (:ids) and a.region = :region
                order by coalesce(p.display_priority, 999), a.provider_id
                """)
                .param("ids", titleIds)
                .param("region", region)
                .query((rs, n) -> new Line(
                        rs.getLong("title_id"),
                        rs.getString("type"),
                        new Provider(
                                rs.getInt("provider_id"),
                                rs.getString("name"),
                                rs.getString("short") != null
                                        ? rs.getString("short")
                                        : TmdbMapper.shortName(rs.getString("name")),
                                rs.getString("logo_path"),
                                rs.getString("link"))))
                .list();
        Map<Long, Availability> result = new HashMap<>();
        lines.stream().collect(Collectors.groupingBy(Line::titleId)).forEach((titleId, rows) -> {
            Function<String, List<Provider>> of =
                    type -> rows.stream().filter(r -> r.type().equals(type)).map(Line::provider).toList();
            result.put(titleId, new Availability(
                    of.apply("abonnement"), of.apply("location"), of.apply("achat"), rows.getFirst().provider().link()));
        });
        return result;
    }

    /** Arrivées en abonnement détectées entre deux instants, pour une région. */
    public List<Arrival> subscriptionArrivals(Collection<Long> titleIds, String region, Instant from, Instant to) {
        if (titleIds.isEmpty()) return List.of();
        return db.sql("""
                select a.title_id, a.provider_id, p.name, a.first_seen_at
                from title_availability a left join providers p on p.id = a.provider_id
                where a.title_id in (:ids) and a.region = :region and a.type = 'abonnement'
                  and a.first_seen_at >= :from and a.first_seen_at < :to
                """)
                .param("ids", titleIds)
                .param("region", region)
                .param("from", Timestamp.from(from))
                .param("to", Timestamp.from(to))
                .query((rs, n) -> new Arrival(
                        rs.getLong("title_id"),
                        rs.getInt("provider_id"),
                        rs.getString("name"),
                        rs.getTimestamp("first_seen_at").toInstant()))
                .list();
    }

    // ─── Saisons et épisodes ──────────────────────────────────────────────────

    @Transactional
    public void upsertSeasons(long titleId, List<SeasonData> seasons) {
        List<SeasonData> unique = distinct(seasons, SeasonData::number);
        if (unique.isEmpty()) return;
        db.sql("""
                insert into seasons (title_id, season_number, name, episode_count, air_date, poster_path)
                select :id, s.number, s.name, s.count, cast(s.air as date), s.poster
                from unnest(cast(:numbers as int[]), cast(:names as text[]), cast(:counts as int[]),
                  cast(:airs as text[]), cast(:posters as text[])) as s(number, name, count, air, poster)
                on conflict (title_id, season_number) do update set name = excluded.name,
                  episode_count = excluded.episode_count, air_date = excluded.air_date,
                  poster_path = excluded.poster_path
                """)
                .param("id", titleId)
                .param("numbers", unique.stream().map(SeasonData::number).toArray(Integer[]::new))
                .param("names", unique.stream().map(SeasonData::name).toArray(String[]::new))
                .param("counts", unique.stream().map(SeasonData::episodeCount).toArray(Integer[]::new))
                .param("airs", unique.stream().map(x -> text(x.airDate())).toArray(String[]::new))
                .param("posters", unique.stream().map(SeasonData::posterPath).toArray(String[]::new))
                .update();
    }

    /** Insère ou met à jour les épisodes ; l'airstamp TVmaze déjà connu n'est jamais effacé. */
    @Transactional
    public void upsertEpisodes(long titleId, List<EpisodeData> episodes) {
        List<EpisodeData> unique = distinct(episodes, e -> e.season() + ":" + e.number());
        if (unique.isEmpty()) return;
        db.sql("""
                insert into episodes (title_id, season_number, episode_number, name, overview, still_path,
                  air_date, airstamp, runtime)
                select :id, e.season, e.number, e.name, e.overview, e.still, cast(e.air as date),
                  cast(e.airstamp as timestamptz), e.runtime
                from unnest(cast(:seasons as int[]), cast(:numbers as int[]), cast(:names as text[]),
                  cast(:overviews as text[]), cast(:stills as text[]), cast(:airs as text[]),
                  cast(:airstamps as text[]), cast(:runtimes as int[]))
                  as e(season, number, name, overview, still, air, airstamp, runtime)
                on conflict (title_id, season_number, episode_number) do update set
                  name = excluded.name, overview = excluded.overview, still_path = excluded.still_path,
                  air_date = excluded.air_date, airstamp = coalesce(excluded.airstamp, episodes.airstamp),
                  runtime = excluded.runtime
                """)
                .param("id", titleId)
                .param("seasons", unique.stream().map(EpisodeData::season).toArray(Integer[]::new))
                .param("numbers", unique.stream().map(EpisodeData::number).toArray(Integer[]::new))
                .param("names", unique.stream().map(EpisodeData::name).toArray(String[]::new))
                .param("overviews", unique.stream().map(EpisodeData::overview).toArray(String[]::new))
                .param("stills", unique.stream().map(EpisodeData::stillPath).toArray(String[]::new))
                .param("airs", unique.stream().map(e -> text(e.airDate())).toArray(String[]::new))
                .param("airstamps", unique.stream().map(e -> text(e.airstamp())).toArray(String[]::new))
                .param("runtimes", unique.stream().map(EpisodeData::runtime).toArray(Integer[]::new))
                .update();
    }

    /** Première occurrence de chaque clé : une insertion groupée refuse deux fois la même ligne. */
    private static <T> List<T> distinct(List<T> items, Function<T, Object> key) {
        return List.copyOf(items.stream()
                .collect(Collectors.toMap(key, item -> item, (a, b) -> a, LinkedHashMap::new))
                .values());
    }

    /** Valeur passée en texte dans un tableau SQL (date ou instant ISO) ; null reste null. */
    private static String text(Object value) {
        return value == null ? null : value.toString();
    }

    public List<EpisodeRow> episodes(long titleId) {
        return db.sql(EPISODE_SELECT + " where title_id = :id order by season_number, episode_number")
                .param("id", titleId)
                .query(TitleStore::episodeRow)
                .list();
    }

    public List<EpisodeRow> episodes(long titleId, int season) {
        return db.sql(EPISODE_SELECT + " where title_id = :id and season_number = :season order by episode_number")
                .param("id", titleId)
                .param("season", season)
                .query(TitleStore::episodeRow)
                .list();
    }

    public List<EpisodeRow> episodesByIds(Collection<Long> ids) {
        if (ids.isEmpty()) return List.of();
        return db.sql(EPISODE_SELECT + " where id in (:ids)").param("ids", ids).query(TitleStore::episodeRow).list();
    }

    /**
     * Vrai s'il faut recharger les épisodes : jamais chargés, chargés avant {@code loadedBefore}
     * (noms, dates et heures changent), ou incomplets par rapport aux saisons (nouvelle saison).
     */
    public boolean episodesOutdated(long titleId, Instant loadedBefore) {
        return db.sql("""
                select not exists (select 1 from episodes where title_id = :id)
                  or (select episodes_updated_at is null or episodes_updated_at < :before
                      from titles where id = :id)
                  or coalesce((select sum(episode_count) from seasons where title_id = :id), 0)
                     > (select count(*) from episodes where title_id = :id)
                """)
                .param("id", titleId)
                .param("before", Timestamp.from(loadedBefore))
                .query(Boolean.class)
                .single();
    }

    public void markEpisodesLoaded(long titleId, Instant at) {
        db.sql("update titles set episodes_updated_at = :at where id = :id")
                .param("at", Timestamp.from(at))
                .param("id", titleId)
                .update();
    }

    // ─── Lecture ──────────────────────────────────────────────────────────────

    private static final String TITLE_SELECT = """
            select id, tmdb_id, media_type, is_anime, imdb_id, tvmaze_id, title, original_title, overview,
              poster_path, backdrop_path, genres, status, ended, network, runtime, imdb_rating, imdb_votes,
              rt_score, ratings_updated_at, updated_at,
              coalesce(
                (select extract(year from min(r.date)) from release_dates r where r.title_id = titles.id),
                (select extract(year from min(s.air_date)) from seasons s
                  where s.title_id = titles.id and s.season_number > 0))::int as year
            from titles
            """;

    private static final String EPISODE_SELECT = """
            select id, title_id, season_number, episode_number, name, overview, still_path, air_date, airstamp,
              runtime, imdb_rating from episodes
            """;

    private static TitleRow titleRow(ResultSet rs, int n) throws SQLException {
        return new TitleRow(
                rs.getLong("id"),
                rs.getInt("tmdb_id"),
                rs.getString("media_type"),
                rs.getBoolean("is_anime"),
                rs.getString("imdb_id"),
                (Integer) rs.getObject("tvmaze_id"),
                rs.getString("title"),
                rs.getString("original_title"),
                rs.getString("overview"),
                rs.getString("poster_path"),
                rs.getString("backdrop_path"),
                strings(rs.getArray("genres")),
                rs.getString("status"),
                (Boolean) rs.getObject("ended"),
                rs.getString("network"),
                (Integer) rs.getObject("runtime"),
                rs.getBigDecimal("imdb_rating") == null ? null : rs.getBigDecimal("imdb_rating").doubleValue(),
                (Integer) rs.getObject("imdb_votes"),
                (Integer) rs.getObject("rt_score"),
                instant(rs.getTimestamp("ratings_updated_at")),
                (Integer) rs.getObject("year"),
                instant(rs.getTimestamp("updated_at")));
    }

    private static EpisodeRow episodeRow(ResultSet rs, int n) throws SQLException {
        Date air = rs.getDate("air_date");
        return new EpisodeRow(
                rs.getLong("id"),
                rs.getLong("title_id"),
                rs.getInt("season_number"),
                rs.getInt("episode_number"),
                rs.getString("name"),
                rs.getString("overview"),
                rs.getString("still_path"),
                air == null ? null : air.toLocalDate(),
                instant(rs.getTimestamp("airstamp")),
                (Integer) rs.getObject("runtime"),
                rs.getBigDecimal("imdb_rating") == null ? null : rs.getBigDecimal("imdb_rating").doubleValue());
    }

    private static List<String> strings(Array array) throws SQLException {
        if (array == null) return List.of();
        return new ArrayList<>(List.of((String[]) array.getArray()));
    }

    static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
