package com.zabava.api.catalog;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;

import com.zabava.api.catalog.TitleStore.EpisodeData;
import com.zabava.api.catalog.TitleStore.EpisodeRow;
import com.zabava.api.catalog.TitleStore.Offer;
import com.zabava.api.catalog.TitleStore.ProviderData;
import com.zabava.api.catalog.TitleStore.ReleaseDate;
import com.zabava.api.catalog.TitleStore.SeasonData;
import com.zabava.api.catalog.TitleStore.TitleData;
import com.zabava.api.catalog.TitleStore.TitleRow;
import com.zabava.api.catalog.dto.CatalogDtos.Availability;
import com.zabava.api.catalog.dto.CatalogDtos.CastMember;
import com.zabava.api.catalog.dto.CatalogDtos.Collection;
import com.zabava.api.catalog.dto.CatalogDtos.Crew;
import com.zabava.api.catalog.dto.CatalogDtos.Episode;
import com.zabava.api.catalog.dto.CatalogDtos.Provider;
import com.zabava.api.catalog.dto.CatalogDtos.SeasonDetail;
import com.zabava.api.catalog.dto.CatalogDtos.SeasonSummary;
import com.zabava.api.catalog.dto.CatalogDtos.TitleDetail;
import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;
import com.zabava.api.catalog.dto.CatalogDtos.UserTitle;
import com.zabava.api.common.ApiException;
import com.zabava.api.common.Json;
import com.zabava.api.common.MediaType;
import com.zabava.api.common.TitleRef;
import com.zabava.api.me.LibraryStore;
import com.zabava.api.me.LibraryStore.UserTitleRow;
import com.zabava.api.me.ProfileService.Prefs;
import com.zabava.api.omdb.OmdbClient;
import com.zabava.api.tmdb.TmdbClient;
import com.zabava.api.tvmaze.TvmazeClient;

import tools.jackson.databind.JsonNode;

/**
 * Fiches titre, saisons et épisodes. Chaque fiche consultée est gardée en base
 * (titles, release_dates, title_availability, seasons, episodes — specs/docs/11 §1).
 */
@Service
public class TitleService {

    private static final Logger log = LoggerFactory.getLogger(TitleService.class);

    /** Fiches TMDB gardées 24 h, notes OMDb 7 jours (specs/docs/11 §1). */
    static final Duration TITLE_TTL = Duration.ofHours(24);
    static final Duration RATINGS_TTL = Duration.ofDays(7);
    private static final int CAST_SIZE = 15;
    private static final int SIMILAR_SIZE = 8;
    /** TMDB accepte au plus 20 éléments dans append_to_response. */
    private static final int SEASONS_PER_CALL = 20;

    private static final String MOVIE_APPEND =
            "credits,videos,release_dates,watch/providers,recommendations,similar,external_ids,keywords";
    private static final String TV_APPEND =
            "credits,videos,content_ratings,watch/providers,recommendations,similar,external_ids,keywords";

    private final TmdbClient tmdb;
    private final OmdbClient omdb;
    private final TvmazeClient tvmaze;
    private final TitleStore store;
    private final LibraryStore library;
    private final Clock clock;

    public TitleService(
            TmdbClient tmdb, OmdbClient omdb, TvmazeClient tvmaze, TitleStore store, LibraryStore library, Clock clock) {
        this.tmdb = tmdb;
        this.omdb = omdb;
        this.tvmaze = tvmaze;
        this.store = store;
        this.library = library;
        this.clock = clock;
    }

    // ─── Fiche ────────────────────────────────────────────────────────────────

    public TitleDetail detail(TitleRef ref, Prefs prefs) {
        String tmdbType = ref.type().tmdbType();
        JsonNode d = details(tmdbType, ref.tmdbId(), prefs.language());
        long id = persist(d, tmdbType);
        TitleRow row = refreshRatings(store.findById(id).orElseThrow());
        MediaType type = row.type();
        boolean movie = type == MediaType.MOVIE;
        String region = prefs.region();

        Map<String, LocalDate> releases = movie ? releaseDates(d).getOrDefault(region, Map.of()) : Map.of();
        Optional<UserTitleRow> userTitle = library.find(prefs.userId(), id);

        return new TitleDetail(
                TitleRef.format(type, ref.tmdbId()),
                ref.tmdbId(),
                type.key(),
                row.title(),
                row.originalTitle(),
                year(d, movie),
                row.posterPath(),
                row.backdropPath(),
                row.genres(),
                certification(d, movie, region),
                row.runtime(),
                row.imdbRating(),
                row.imdbVotes(),
                row.rtScore(),
                row.overview(),
                TmdbMapper.languageName(Json.text(d, "original_language")),
                country(d),
                studio(d),
                releases.get("salle"),
                releases.get("numerique"),
                movie ? Json.integer(d.path("belongs_to_collection"), "id") : null,
                row.status(),
                row.network(),
                row.ended(),
                movie ? null : seasonSummaries(d),
                availability(d, region),
                trailerKey(d, prefs.language()),
                cast(d),
                crew(d, movie),
                movie ? collection(d, ref.tmdbId(), prefs.language()) : null,
                similar(d, type),
                userTitle.map(u -> userTitle(type, ref.tmdbId(), u)).orElse(null));
    }

    // ─── Saison ───────────────────────────────────────────────────────────────

    public SeasonDetail season(int tmdbId, int number, Prefs prefs) {
        TitleRow row = ensure(new TitleRef(MediaType.TV, tmdbId), prefs, false);
        JsonNode season;
        try {
            season = tmdb.get("/tv/" + tmdbId + "/season/" + number, TmdbClient.params("language", prefs.language()));
        } catch (HttpClientErrorException.NotFound e) {
            throw ApiException.notFound("Saison introuvable");
        }
        store.upsertEpisodes(row.id(), episodes(season, number, airstamps(row)));
        List<EpisodeRow> rows = store.episodes(row.id(), number);
        Map<Long, Instant> watched = library.watched(prefs.userId(), List.of(row.id()));
        return new SeasonDetail(
                number,
                Json.text(season, "name"),
                rows.size(),
                TmdbMapper.date(Json.text(season, "air_date")),
                rows.stream().map(e -> episode(e, watched.get(e.id()))).toList());
    }

    // ─── Tous les épisodes ────────────────────────────────────────────────────

    /**
     * Épisodes de toutes les saisons d'une série, avec la date de visionnage de chacun :
     * la fiche en a besoin pour le prochain épisode et les épisodes précédents à cocher.
     */
    public List<Episode> allEpisodes(TitleRef ref, Prefs prefs) {
        if (!ref.type().isSeries()) throw ApiException.notFound("Pas d'épisodes pour un film");
        TitleRow row = ensure(ref, prefs, true);
        Map<Long, Instant> watched = library.watched(prefs.userId(), List.of(row.id()));
        return store.episodes(row.id()).stream().map(e -> episode(e, watched.get(e.id()))).toList();
    }

    public static Episode episode(EpisodeRow e, Instant watchedAt) {
        return new Episode(e.id(), e.season(), e.number(), e.name(), e.overview(), e.stillPath(), e.airDate(),
                e.airstamp(), e.runtime(), e.imdbRating(), watchedAt);
    }

    // ─── Titres de la liste ───────────────────────────────────────────────────

    /**
     * Garantit que le titre est en base et à jour (24 h) ; pour une série, avec tous ses
     * épisodes si {@code withEpisodes}. Renvoie la ligne {@code titles}.
     */
    public TitleRow ensure(TitleRef ref, Prefs prefs, boolean withEpisodes) {
        return ensure(ref, prefs, withEpisodes, TITLE_TTL);
    }

    /**
     * Comme {@link #ensure(TitleRef, Prefs, boolean)}, avec une ancienneté maximale choisie :
     * les tâches de nuit rechargent ce qui a plus de 20 h, pour ne pas sauter un jour.
     */
    public TitleRow ensure(TitleRef ref, Prefs prefs, boolean withEpisodes, Duration maxAge) {
        String tmdbType = ref.type().tmdbType();
        Optional<TitleRow> existing = store.find(tmdbType, ref.tmdbId());
        boolean fresh = existing.map(r -> r.updatedAt().isAfter(clock.instant().minus(maxAge))).orElse(false);
        boolean needsEpisodes = withEpisodes && "tv".equals(tmdbType)
                && existing.map(r -> store.episodesOutdated(r.id(), clock.instant().minus(maxAge)))
                        .orElse(true);
        if (fresh && !needsEpisodes) return existing.get();

        JsonNode d = details(tmdbType, ref.tmdbId(), prefs.language());
        long id = persist(d, tmdbType);
        TitleRow row = refreshRatings(store.findById(id).orElseThrow());
        if (withEpisodes && "tv".equals(tmdbType)) loadAllSeasons(row, d, prefs.language());
        return row;
    }

    /** Charge les épisodes de toutes les saisons, 20 saisons par appel TMDB. */
    private void loadAllSeasons(TitleRow row, JsonNode d, String language) {
        List<Integer> numbers = Json.map(d, "seasons", s -> s.path("season_number").asInt());
        Map<String, Instant> airstamps = airstamps(row);
        for (int from = 0; from < numbers.size(); from += SEASONS_PER_CALL) {
            List<Integer> batch = numbers.subList(from, Math.min(from + SEASONS_PER_CALL, numbers.size()));
            String append = batch.stream().map(n -> "season/" + n).collect(Collectors.joining(","));
            JsonNode body = tmdb.get("/tv/" + row.tmdbId(),
                    TmdbClient.params("language", language, "append_to_response", append));
            for (Integer number : batch) {
                store.upsertEpisodes(row.id(), episodes(body.path("season/" + number), number, airstamps));
            }
        }
        store.markEpisodesLoaded(row.id(), clock.instant());
    }

    // ─── TMDB → base ──────────────────────────────────────────────────────────

    private JsonNode details(String tmdbType, int tmdbId, String language) {
        try {
            return tmdb.get("/" + tmdbType + "/" + tmdbId, TmdbClient.params(
                    "language", language,
                    "append_to_response", "movie".equals(tmdbType) ? MOVIE_APPEND : TV_APPEND,
                    "include_video_language", TmdbMapper.languagePrefix(language) + ",en,null"));
        } catch (HttpClientErrorException.NotFound e) {
            throw ApiException.notFound("Titre introuvable");
        }
    }

    /** Enregistre fiche, dates de sortie, offres et saisons ; renvoie titles.id. */
    private long persist(JsonNode d, String tmdbType) {
        boolean movie = "movie".equals(tmdbType);
        boolean anime = !movie && TmdbMapper.isAnime(d);
        TitleStore.Upserted saved = store.upsert(new TitleData(
                d.path("id").asInt(),
                tmdbType,
                anime,
                Json.text(d.path("external_ids"), "imdb_id") != null
                        ? Json.text(d.path("external_ids"), "imdb_id")
                        : Json.text(d, "imdb_id"),
                TmdbMapper.title(d),
                Json.text(d, movie ? "original_title" : "original_name"),
                Json.text(d, "overview"),
                Json.text(d, "poster_path"),
                Json.text(d, "backdrop_path"),
                Json.map(d, "genres", g -> Json.text(g, "name")).stream().filter(Objects::nonNull).toList(),
                movie ? null : seriesStatus(Json.text(d, "status")),
                movie ? null : isEnded(Json.text(d, "status")),
                movie ? null : network(d),
                runtime(d, movie),
                Json.text(d, "original_language"),
                originCountry(d),
                studio(d),
                null,
                movie ? Json.integer(d.path("belongs_to_collection"), "id") : null,
                null,
                Json.decimal(d, "popularity"),
                year(d, movie)));
        long id = saved.id();

        if (movie) {
            List<ReleaseDate> dates = new ArrayList<>();
            releaseDates(d).forEach((region, byType) ->
                    byType.forEach((type, date) -> dates.add(new ReleaseDate(region, type, date))));
            store.replaceReleaseDates(id, dates);
        } else {
            store.upsertSeasons(id, Json.map(d, "seasons", s -> new SeasonData(
                    s.path("season_number").asInt(),
                    Json.text(s, "name"),
                    Json.integer(s, "episode_count"),
                    TmdbMapper.date(Json.text(s, "air_date")),
                    Json.text(s, "poster_path"))));
        }

        JsonNode providers = d.path("watch/providers").path("results");
        Set<String> regions = new HashSet<>();
        List<Offer> offers = new ArrayList<>();
        Map<Integer, ProviderData> seen = new HashMap<>();
        for (Map.Entry<String, JsonNode> entry : providers.properties()) {
            String region = entry.getKey();
            regions.add(region);
            String link = Json.text(entry.getValue(), "link");
            OFFER_TYPES.forEach((field, type) -> Json.array(entry.getValue(), field).forEach(p -> {
                int providerId = p.path("provider_id").asInt();
                offers.add(new Offer(region, providerId, type, link));
                String name = Json.text(p, "provider_name");
                seen.putIfAbsent(providerId, new ProviderData(
                        providerId, name, TmdbMapper.shortName(name),
                        Json.text(p, "logo_path"), Json.integer(p, "display_priority")));
            }));
        }
        store.upsertProviders(seen.values());
        store.replaceOffers(id, regions, offers, saved.created());
        return id;
    }

    private static final Map<String, String> OFFER_TYPES = Map.of(
            "flatrate", "abonnement",
            "rent", "location",
            "buy", "achat");

    /** Notes OMDb, rafraîchies si elles ont plus de 7 jours. Une panne d'OMDb n'empêche pas la fiche. */
    public TitleRow refreshRatings(TitleRow row) {
        boolean stale = row.ratingsUpdatedAt() == null
                || row.ratingsUpdatedAt().isBefore(clock.instant().minus(RATINGS_TTL));
        if (!stale || row.imdbId() == null || !omdb.enabled()) return row;
        try {
            store.updateRatings(row.id(), omdb.ratings(row.imdbId()));
            return store.findById(row.id()).orElse(row);
        } catch (RestClientException e) {
            log.warn("Notes OMDb indisponibles pour {}", row.imdbId(), e);
            return row;
        }
    }

    /** Heures exactes TVmaze ; vide si la série est inconnue ou si TVmaze est indisponible. */
    private Map<String, Instant> airstamps(TitleRow row) {
        if (row.imdbId() == null) return Map.of();
        try {
            Integer showId = row.tvmazeId();
            if (showId == null) {
                showId = tvmaze.lookupByImdb(row.imdbId()).orElse(null);
                if (showId == null) return Map.of();
                store.setTvmazeId(row.id(), showId);
            }
            return tvmaze.airstamps(showId);
        } catch (RestClientException e) {
            log.warn("TVmaze indisponible pour {}", row.imdbId(), e);
            return Map.of();
        }
    }

    private static List<EpisodeData> episodes(JsonNode season, int number, Map<String, Instant> airstamps) {
        return Json.map(season, "episodes", e -> {
            int episode = e.path("episode_number").asInt();
            return new EpisodeData(
                    number,
                    episode,
                    Json.text(e, "name"),
                    Json.text(e, "overview"),
                    Json.text(e, "still_path"),
                    TmdbMapper.date(Json.text(e, "air_date")),
                    airstamps.get(number + ":" + episode),
                    Json.integer(e, "runtime"));
        });
    }

    // ─── Champs de la fiche ───────────────────────────────────────────────────

    /** Dates de sortie par région : salle (types 2 et 3), numérique (4), physique (5). */
    static Map<String, Map<String, LocalDate>> releaseDates(JsonNode d) {
        Map<String, Map<String, LocalDate>> result = new HashMap<>();
        for (JsonNode region : Json.array(d.path("release_dates"), "results")) {
            String code = Json.text(region, "iso_3166_1");
            Map<String, LocalDate> byType = new HashMap<>();
            for (JsonNode release : Json.array(region, "release_dates")) {
                String type = switch (release.path("type").asInt()) {
                    case 2, 3 -> "salle";
                    case 4 -> "numerique";
                    case 5 -> "physique";
                    default -> null;
                };
                LocalDate date = TmdbMapper.date(Json.text(release, "release_date"));
                if (type != null && date != null) byType.merge(type, date, (a, b) -> a.isBefore(b) ? a : b);
            }
            if (code != null && !byType.isEmpty()) result.put(code, byType);
        }
        return result;
    }

    private static String certification(JsonNode d, boolean movie, String region) {
        if (movie) {
            for (JsonNode r : Json.array(d.path("release_dates"), "results")) {
                if (!region.equals(Json.text(r, "iso_3166_1"))) continue;
                for (JsonNode release : Json.array(r, "release_dates")) {
                    String cert = Json.text(release, "certification");
                    if (cert != null) return cert;
                }
            }
            return null;
        }
        for (JsonNode r : Json.array(d.path("content_ratings"), "results")) {
            if (region.equals(Json.text(r, "iso_3166_1"))) return Json.text(r, "rating");
        }
        return null;
    }

    /** Offres de la région ; « Disponibilité inconnue » côté app si tout est vide. */
    static Availability availability(JsonNode d, String region) {
        JsonNode r = d.path("watch/providers").path("results").path(region);
        if (r.isMissingNode()) return Availability.EMPTY;
        String link = Json.text(r, "link");
        return new Availability(providers(r, "flatrate", link), providers(r, "rent", link), providers(r, "buy", link), link);
    }

    private static List<Provider> providers(JsonNode region, String field, String link) {
        return Json.array(region, field).stream()
                .sorted(Comparator.comparingInt(p -> p.path("display_priority").asInt(999)))
                .map(p -> TmdbMapper.provider(p, null, link))
                .toList();
    }

    /** Bande-annonce YouTube : d'abord dans la langue de l'utilisateur, sinon en anglais. */
    private static String trailerKey(JsonNode d, String language) {
        String prefix = TmdbMapper.languagePrefix(language);
        List<JsonNode> trailers = Json.array(d.path("videos"), "results").stream()
                .filter(v -> "Trailer".equals(Json.text(v, "type")) && "YouTube".equals(Json.text(v, "site")))
                .toList();
        return trailers.stream()
                .filter(v -> prefix.equals(Json.text(v, "iso_639_1")))
                .findFirst()
                .or(() -> trailers.stream().filter(v -> "en".equals(Json.text(v, "iso_639_1"))).findFirst())
                .or(() -> trailers.stream().findFirst())
                .map(v -> Json.text(v, "key"))
                .orElse(null);
    }

    private static List<CastMember> cast(JsonNode d) {
        return Json.array(d.path("credits"), "cast").stream()
                .limit(CAST_SIZE)
                .map(c -> new CastMember(
                        c.path("id").asInt(), Json.text(c, "name"), Json.text(c, "character"), Json.text(c, "profile_path")))
                .toList();
    }

    private static Crew crew(JsonNode d, boolean movie) {
        if (movie) {
            List<JsonNode> crew = Json.array(d.path("credits"), "crew");
            return new Crew(
                    names(crew, Set.of("Director")),
                    names(crew, Set.of("Screenplay", "Writer", "Story", "Novel")),
                    List.of(),
                    List.of());
        }
        return new Crew(
                List.of(),
                List.of(),
                Json.map(d, "created_by", c -> Json.text(c, "name")).stream().filter(Objects::nonNull).toList(),
                Json.map(d, "networks", n -> Json.text(n, "name")).stream().filter(Objects::nonNull).toList());
    }

    private static List<String> names(List<JsonNode> crew, Set<String> jobs) {
        return crew.stream()
                .filter(c -> jobs.contains(Json.text(c, "job")))
                .map(c -> Json.text(c, "name"))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    /** Autres volets de la saga, triés par date. */
    private Collection collection(JsonNode d, int selfId, String language) {
        JsonNode ref = d.path("belongs_to_collection");
        Integer id = Json.integer(ref, "id");
        if (id == null) return null;
        try {
            JsonNode body = tmdb.get("/collection/" + id, TmdbClient.params("language", language));
            List<TitleLite> parts = Json.map(body, "parts", p -> TmdbMapper.lite(p, "movie")).stream()
                    .filter(p -> p.tmdbId() != selfId)
                    .sorted(Comparator.comparing(TitleLite::releaseDate, Comparator.nullsLast(Comparator.naturalOrder())))
                    .toList();
            return new Collection(id, Json.text(body, "name"), parts);
        } catch (HttpClientErrorException.NotFound e) {
            return null;
        }
    }

    /** Recommandations TMDB, complétées par les titres similaires ; même type, 8 au maximum. */
    private static List<TitleLite> similar(JsonNode d, MediaType type) {
        Map<String, TitleLite> result = new LinkedHashMap<>();
        for (String field : List.of("recommendations", "similar")) {
            for (JsonNode node : Json.array(d.path(field), "results")) {
                TitleLite lite = TmdbMapper.lite(node, type.tmdbType());
                if (lite.type().equals(type.key()) && lite.tmdbId() != d.path("id").asInt()) {
                    result.putIfAbsent(lite.id(), lite);
                }
            }
        }
        return result.values().stream().limit(SIMILAR_SIZE).toList();
    }

    private static List<SeasonSummary> seasonSummaries(JsonNode d) {
        return Json.map(d, "seasons", s -> new SeasonSummary(
                s.path("season_number").asInt(),
                Json.text(s, "name"),
                Json.integer(s, "episode_count"),
                TmdbMapper.date(Json.text(s, "air_date"))));
    }

    public static UserTitle userTitle(MediaType type, int tmdbId, UserTitleRow row) {
        return new UserTitle(
                TitleRef.format(type, tmdbId), row.status(), row.addedAt(), row.watchedAt(), row.notificationsEnabled());
    }

    private static Integer year(JsonNode d, boolean movie) {
        LocalDate date = TmdbMapper.date(Json.text(d, movie ? "release_date" : "first_air_date"));
        return date == null ? null : date.getYear();
    }

    private static Integer runtime(JsonNode d, boolean movie) {
        if (movie) return Json.integer(d, "runtime");
        List<JsonNode> runtimes = Json.array(d, "episode_run_time");
        if (!runtimes.isEmpty()) return runtimes.getFirst().asInt();
        return Json.integer(d.path("last_episode_to_air"), "runtime");
    }

    /** Statut affiché : En cours, Terminée, Annulée. */
    static String seriesStatus(String tmdbStatus) {
        if (tmdbStatus == null) return null;
        return switch (tmdbStatus) {
            case "Ended" -> "Terminée";
            case "Canceled" -> "Annulée";
            default -> "En cours";
        };
    }

    static Boolean isEnded(String tmdbStatus) {
        return "Ended".equals(tmdbStatus) || "Canceled".equals(tmdbStatus);
    }

    static String network(JsonNode d) {
        List<JsonNode> networks = Json.array(d, "networks");
        return networks.isEmpty() ? null : Json.text(networks.getFirst(), "name");
    }

    private static String studio(JsonNode d) {
        List<JsonNode> companies = Json.array(d, "production_companies");
        return companies.isEmpty() ? null : Json.text(companies.getFirst(), "name");
    }

    private static String originCountry(JsonNode d) {
        List<JsonNode> origin = Json.array(d, "origin_country");
        if (!origin.isEmpty()) return origin.getFirst().asString(null);
        List<JsonNode> countries = Json.array(d, "production_countries");
        return countries.isEmpty() ? null : Json.text(countries.getFirst(), "iso_3166_1");
    }

    /** Nom du pays en français : « US » → « États-Unis ». */
    private static String country(JsonNode d) {
        String code = originCountry(d);
        if (code == null) return null;
        String name = Locale.of("", code).getDisplayCountry(Locale.FRENCH);
        return name.isBlank() ? code : name;
    }
}
