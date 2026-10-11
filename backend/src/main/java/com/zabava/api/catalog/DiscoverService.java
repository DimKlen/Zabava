package com.zabava.api.catalog;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.zabava.api.catalog.dto.CatalogDtos.DiscoverResult;
import com.zabava.api.catalog.dto.CatalogDtos.PersonDetail;
import com.zabava.api.catalog.dto.CatalogDtos.PersonLite;
import com.zabava.api.catalog.dto.CatalogDtos.SearchResult;
import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;
import com.zabava.api.common.ApiException;
import com.zabava.api.common.Json;
import com.zabava.api.common.MediaType;
import com.zabava.api.me.ProfileService.Prefs;
import com.zabava.api.tmdb.TmdbClient;

import tools.jackson.databind.JsonNode;

/** Recherche, Découvrir (filtres et listes), tendances et fiches personne (specs/docs/08, 07 §7.3). */
@Service
public class DiscoverService {

    public static final int PAGE_SIZE = 20;
    private static final int MAX_PEOPLE_IN_ALL = 3;

    /** Filtres de la recherche avancée (GET /discover). */
    public record DiscoverQuery(
            List<MediaType> types,
            List<String> genres,
            List<Integer> cast,
            Integer yearFrom,
            Integer yearTo,
            Double minRating,
            String providers,
            String lang,
            Integer maxRuntime,
            String sort,
            int page) {}

    private final TmdbClient tmdb;
    private final Clock clock;

    public DiscoverService(TmdbClient tmdb, Clock clock) {
        this.tmdb = tmdb;
        this.clock = clock;
    }

    // ─── Recherche ────────────────────────────────────────────────────────────

    public SearchResult search(String query, String type, int page, Prefs prefs) {
        String path = switch (type) {
            case "all" -> "/search/multi";
            case "movie" -> "/search/movie";
            case "tv", "anime" -> "/search/tv";
            case "person" -> "/search/person";
            default -> throw ApiException.badRequest("Type de recherche inconnu : " + type);
        };
        JsonNode body = tmdb.search(path, TmdbClient.params(
                "query", query,
                "language", prefs.language(),
                "page", String.valueOf(page),
                "include_adult", "false"));
        List<JsonNode> results = Json.array(body, "results");

        List<PersonLite> people = new ArrayList<>();
        List<TitleLite> titles = new ArrayList<>();
        for (JsonNode node : results) {
            String mediaType = switch (type) {
                case "person" -> "person";
                case "movie" -> "movie";
                case "tv", "anime" -> "tv";
                default -> Json.text(node, "media_type");
            };
            if ("person".equals(mediaType)) {
                people.add(TmdbMapper.person(node));
            } else if ("movie".equals(mediaType) || "tv".equals(mediaType)) {
                TitleLite lite = TmdbMapper.lite(node, mediaType);
                if (matchesType(lite, type)) titles.add(lite);
            }
        }
        // « Tout » : jusqu'à 3 personnes en premier, puis les titres (specs/docs/08 §8.1).
        if ("all".equals(type)) people = page == 1 ? people.stream().limit(MAX_PEOPLE_IN_ALL).toList() : List.of();
        return new SearchResult(people, titles, page, body.path("total_pages").asInt(1));
    }

    private static boolean matchesType(TitleLite lite, String type) {
        return switch (type) {
            case "tv" -> "tv".equals(lite.type());
            case "anime" -> "anime".equals(lite.type());
            default -> true;
        };
    }

    // ─── Découvrir : filtres ──────────────────────────────────────────────────

    public DiscoverResult discover(DiscoverQuery query, Prefs prefs) {
        if (!query.cast().isEmpty()) return discoverByCast(query, prefs);
        List<TitleLite> results = new ArrayList<>();
        int total = 0;
        for (MediaType type : query.types()) {
            TreeMap<String, String> params = discoverParams(query, type, prefs);
            if (params == null) continue;
            JsonNode body = tmdb.get("/discover/" + type.tmdbType(), params);
            results.addAll(filterType(Json.map(body, "results", n -> TmdbMapper.lite(n, type.tmdbType())), type));
            total += body.path("total_results").asInt(0);
        }
        results.sort(comparator(query.sort()));
        return new DiscoverResult(results, total, query.page());
    }

    public int count(DiscoverQuery query, Prefs prefs) {
        return discover(query, prefs).total();
    }

    /** Paramètres TMDB d'un type ; null si les filtres rendent le type vide. */
    private TreeMap<String, String> discoverParams(DiscoverQuery q, MediaType type, Prefs prefs) {
        boolean movie = type == MediaType.MOVIE;
        LocalDate today = LocalDate.now(clock);
        var p = TmdbClient.params(
                "language", prefs.language(),
                "page", String.valueOf(q.page()),
                "include_adult", "false");

        List<Integer> genreIds = Genres.tmdbIds(q.genres(), movie);
        if (!q.genres().isEmpty() && genreIds.isEmpty()) return null;
        if (type == MediaType.ANIME) {
            p.put("with_genres", String.valueOf(TmdbMapper.ANIMATION_GENRE));
            p.put("with_origin_country", "JP");
        } else if (!genreIds.isEmpty()) {
            p.put("with_genres", join(genreIds, "|"));
        }

        String dateField = movie ? "primary_release_date" : "first_air_date";
        if (q.yearFrom() != null) p.put(dateField + ".gte", q.yearFrom() + "-01-01");
        if (q.yearTo() != null) p.put(dateField + ".lte", q.yearTo() + "-12-31");
        if (q.minRating() != null && q.minRating() > 0) {
            p.put("vote_average.gte", String.valueOf(q.minRating()));
            p.put("vote_count.gte", "50");
        }
        if (q.lang() != null) p.put("with_original_language", q.lang());
        if (q.maxRuntime() != null) p.put("with_runtime.lte", String.valueOf(q.maxRuntime()));

        if (q.providers() != null) {
            String ids = providerFilter(q.providers(), prefs);
            if (ids == null) return null;
            p.put("with_watch_providers", ids);
            p.put("watch_region", prefs.region());
            p.put("with_watch_monetization_types", "flatrate");
        }

        switch (q.sort() == null ? "pop" : q.sort()) {
            case "rating" -> {
                p.put("sort_by", "vote_average.desc");
                p.putIfAbsent("vote_count.gte", movie ? "1000" : "500");
            }
            case "recent" -> {
                p.put("sort_by", dateField + ".desc");
                p.putIfAbsent(dateField + ".lte", today.toString());
            }
            default -> p.put("sort_by", "popularity.desc");
        }
        return p;
    }

    /** « mine » = mes plateformes (aucune choisie → aucun résultat), sinon un id de plateforme. */
    private static String providerFilter(String providers, Prefs prefs) {
        if ("mine".equals(providers)) return prefs.providerIds().isEmpty() ? null : join(prefs.providerIds(), "|");
        try {
            return String.valueOf(Integer.parseInt(providers));
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("Plateforme inconnue : " + providers);
        }
    }

    /**
     * Plusieurs acteurs : titres où ils jouent ensemble (ET). TMDB ne filtre pas les séries par
     * acteur ; on croise donc les filmographies. Les filtres plateforme et durée ne s'appliquent
     * pas ici (absents des filmographies).
     */
    private DiscoverResult discoverByCast(DiscoverQuery q, Prefs prefs) {
        Map<String, JsonNode> common = null;
        for (Integer actor : q.cast()) {
            Map<String, JsonNode> credits = new LinkedHashMap<>();
            JsonNode body = tmdb.get("/person/" + actor + "/combined_credits",
                    TmdbClient.params("language", prefs.language()));
            for (JsonNode work : Json.array(body, "cast")) {
                String mediaType = Json.text(work, "media_type");
                if ("movie".equals(mediaType) || "tv".equals(mediaType)) {
                    credits.putIfAbsent(mediaType + ":" + work.path("id").asInt(), work);
                }
            }
            if (common == null) common = credits;
            else common.keySet().retainAll(credits.keySet());
        }
        if (common == null) common = Map.of();

        Predicate<JsonNode> filters = castFilters(q);
        List<TitleLite> all = common.values().stream()
                .filter(filters)
                .map(n -> TmdbMapper.lite(n, null))
                .filter(t -> q.types().stream().anyMatch(type -> type.key().equals(t.type())))
                .sorted(comparator(q.sort()))
                .toList();
        int from = Math.min((q.page() - 1) * PAGE_SIZE, all.size());
        int to = Math.min(from + PAGE_SIZE, all.size());
        return new DiscoverResult(all.subList(from, to), all.size(), q.page());
    }

    private static Predicate<JsonNode> castFilters(DiscoverQuery q) {
        return node -> {
            boolean movie = "movie".equals(Json.text(node, "media_type"));
            if (!q.genres().isEmpty()) {
                Set<Integer> ids = TmdbMapper.genreIds(node);
                if (Genres.tmdbIds(q.genres(), movie).stream().noneMatch(ids::contains)) return false;
            }
            LocalDate date = TmdbMapper.date(Json.text(node, movie ? "release_date" : "first_air_date"));
            if (q.yearFrom() != null && (date == null || date.getYear() < q.yearFrom())) return false;
            if (q.yearTo() != null && (date == null || date.getYear() > q.yearTo())) return false;
            if (q.minRating() != null && q.minRating() > 0) {
                Double vote = Json.decimal(node, "vote_average");
                if (vote == null || vote < q.minRating()) return false;
            }
            return q.lang() == null || q.lang().equals(Json.text(node, "original_language"));
        };
    }

    // ─── Découvrir : listes ───────────────────────────────────────────────────

    /** Carrousels de Découvrir (specs/docs/08 §8.3). */
    public DiscoverResult list(String list, MediaType type, int page, Prefs prefs) {
        LocalDate today = LocalDate.now(clock);
        boolean movie = type == MediaType.MOVIE;
        String region = prefs.region();
        var base = TmdbClient.params("language", prefs.language(), "page", String.valueOf(page));
        JsonNode body = switch (list) {
            case "trending" -> tmdb.get("/trending/" + type.tmdbType() + "/week", base);
            case "now_playing" -> movieOnly(type, () -> tmdb.get("/movie/now_playing", with(base, "region", region)));
            case "upcoming" -> movieOnly(type, () -> tmdb.get("/movie/upcoming", with(base, "region", region)));
            case "top_rated" -> tmdb.get("/discover/" + type.tmdbType(), animeFilter(type, with(base,
                    "sort_by", "vote_average.desc",
                    "vote_count.gte", movie ? "1000" : "500")));
            case "new_on_mine", "popular_on_mine" -> {
                if (prefs.providerIds().isEmpty()) yield null;
                String sortBy = "new_on_mine".equals(list)
                        ? (movie ? "primary_release_date.desc" : "first_air_date.desc")
                        : "popularity.desc";
                var p = with(base,
                        "with_watch_providers", join(prefs.providerIds(), "|"),
                        "watch_region", region,
                        "with_watch_monetization_types", "flatrate",
                        "sort_by", sortBy);
                if ("new_on_mine".equals(list)) p.put(movie ? "primary_release_date.lte" : "first_air_date.lte", today.toString());
                yield tmdb.get("/discover/" + type.tmdbType(), animeFilter(type, p));
            }
            case "new_seasons", "season_anime" -> {
                if (movie || ("season_anime".equals(list) && type != MediaType.ANIME)) {
                    throw ApiException.badRequest("Liste indisponible pour ce type : " + list);
                }
                yield tmdb.get("/discover/tv", animeFilter(type, with(base,
                        "air_date.gte", today.minusDays(7).toString(),
                        "air_date.lte", today.plusDays(7).toString(),
                        "sort_by", "popularity.desc")));
            }
            default -> throw ApiException.badRequest("Liste inconnue : " + list);
        };
        if (body == null) return new DiscoverResult(List.of(), 0, page);

        List<TitleLite> results = filterType(Json.map(body, "results", n -> TmdbMapper.lite(n, type.tmdbType())), type);
        // Tendances films : hors titres pas encore sortis.
        if ("trending".equals(list) && movie) {
            results = results.stream().filter(t -> t.releaseDate() == null || !t.releaseDate().isAfter(today)).toList();
        }
        return new DiscoverResult(results, body.path("total_results").asInt(results.size()), page);
    }

    private static JsonNode movieOnly(MediaType type, java.util.function.Supplier<JsonNode> call) {
        if (type != MediaType.MOVIE) throw ApiException.badRequest("Liste réservée aux films");
        return call.get();
    }

    /** Animés : genre Animation et origine japonaise (specs/docs/08 §8.3). */
    private static TreeMap<String, String> animeFilter(MediaType type, TreeMap<String, String> params) {
        if (type == MediaType.ANIME) {
            params.put("with_genres", String.valueOf(TmdbMapper.ANIMATION_GENRE));
            params.put("with_origin_country", "JP");
        }
        return params;
    }

    // ─── Tendances ────────────────────────────────────────────────────────────

    public List<TitleLite> trending(String type, String window, Prefs prefs) {
        if (!"day".equals(window) && !"week".equals(window)) throw ApiException.badRequest("Fenêtre inconnue : " + window);
        var params = TmdbClient.params("language", prefs.language());
        if ("all".equals(type)) {
            JsonNode body = tmdb.get("/trending/all/" + window, params);
            return Json.array(body, "results").stream()
                    .filter(n -> !"person".equals(Json.text(n, "media_type")))
                    .map(n -> TmdbMapper.lite(n, null))
                    .toList();
        }
        MediaType mediaType = MediaType.parse(type);
        JsonNode body = tmdb.get("/trending/" + mediaType.tmdbType() + "/" + window, params);
        return filterType(Json.map(body, "results", n -> TmdbMapper.lite(n, mediaType.tmdbType())), mediaType);
    }

    // ─── Personne ─────────────────────────────────────────────────────────────

    public PersonDetail person(int id, Prefs prefs) {
        JsonNode body = tmdb.get("/person/" + id, TmdbClient.params(
                "language", prefs.language(),
                "append_to_response", "combined_credits"));
        String biography = Json.text(body, "biography");
        // Biographie dans la langue choisie, sinon en anglais (specs/docs/07 §7.3).
        if (biography == null && !prefs.language().startsWith("en")) {
            biography = Json.text(tmdb.get("/person/" + id, TmdbClient.params("language", "en-US")), "biography");
        }
        Map<String, TitleLite> credits = new LinkedHashMap<>();
        for (JsonNode work : Json.array(body.path("combined_credits"), "cast")) {
            String mediaType = Json.text(work, "media_type");
            if (!"movie".equals(mediaType) && !"tv".equals(mediaType)) continue;
            TitleLite lite = TmdbMapper.lite(work, mediaType);
            credits.putIfAbsent(lite.id(), lite);
        }
        List<TitleLite> sorted = credits.values().stream()
                .sorted(comparator("pop"))
                .collect(Collectors.toCollection(ArrayList::new));
        return new PersonDetail(
                id,
                Json.text(body, "name"),
                Json.text(body, "profile_path"),
                Json.integer(body, "gender"),
                TmdbMapper.date(Json.text(body, "birthday")),
                Json.text(body, "place_of_birth"),
                biography,
                sorted);
    }

    // ─── Outils ───────────────────────────────────────────────────────────────

    /** Séries : sans les animés ; Animés : seulement les animés. */
    private static List<TitleLite> filterType(List<TitleLite> titles, MediaType type) {
        return titles.stream().filter(t -> type.key().equals(t.type())).toList();
    }

    private static Comparator<TitleLite> comparator(String sort) {
        Comparator<TitleLite> c = switch (sort == null ? "pop" : sort) {
            case "rating" -> Comparator.comparing(TitleLite::voteAverage, Comparator.nullsFirst(Comparator.naturalOrder()));
            case "recent" -> Comparator.comparing(TitleLite::releaseDate, Comparator.nullsFirst(Comparator.naturalOrder()));
            default -> Comparator.comparing(TitleLite::popularity, Comparator.nullsFirst(Comparator.naturalOrder()));
        };
        return c.reversed();
    }

    private static TreeMap<String, String> with(TreeMap<String, String> base, String... pairs) {
        var copy = new TreeMap<>(base);
        copy.putAll(TmdbClient.params(pairs));
        return copy;
    }

    private static String join(List<Integer> ids, String separator) {
        return ids.stream().map(String::valueOf).collect(Collectors.joining(separator));
    }
}
