package com.zabava.api.catalog;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Predicate;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.zabava.api.catalog.dto.CatalogDtos.DiscoverResult;
import com.zabava.api.catalog.dto.CatalogDtos.PersonDetail;
import com.zabava.api.catalog.dto.CatalogDtos.PersonLite;
import com.zabava.api.catalog.dto.CatalogDtos.Role;
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
    /** En dessous de ce nombre de titres en page 1, on cherche aussi les titres proches. */
    private static final int FUZZY_BELOW = 5;
    /** Séries diffusées cette semaine examinées pour « Nouvelles saisons » et « Saison en cours ». */
    private static final int SEASON_CANDIDATE_PAGES = 3;
    private static final int ANIME_TRENDING_PAGES = 5;
    /** Émissions où la personne joue son propre rôle : talk-shows, actualités, téléréalité. */
    private static final Set<Integer> NON_FICTION_TV = Set.of(10763, 10764, 10767);
    private static final java.util.regex.Pattern SELF =
            java.util.regex.Pattern.compile("^(self|himself|herself|themselves|lui-même|elle-même)\\b.*",
                    java.util.regex.Pattern.CASE_INSENSITIVE);
    private static final int ROLES_IN_BIO = 3;

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
            Integer studio,
            String sort,
            int page) {}

    private final TmdbClient tmdb;
    private final PopularPeople popularPeople;
    private final TitleFacts facts;
    private final Clock clock;

    public DiscoverService(TmdbClient tmdb, PopularPeople popularPeople, TitleFacts facts, Clock clock) {
        this.tmdb = tmdb;
        this.popularPeople = popularPeople;
        this.facts = facts;
        this.clock = clock;
    }

    // ─── Recherche ────────────────────────────────────────────────────────────

    public SearchResult search(String query, String type, int page, Prefs prefs) {
        SearchResult tmdbResult = withCloseMatches(tmdbSearch(query, type, page, prefs), query, type, prefs);
        if (!"all".equals(type) && !"person".equals(type)) return tmdbResult;

        // Personnes populaires dont le nom commence par la requête, avant celles de TMDB.
        List<PersonLite> popular = popularPeople.matching(query);
        Set<Integer> popularIds = popular.stream().map(PersonLite::id).collect(Collectors.toSet());
        List<PersonLite> people = new ArrayList<>(page == 1 ? popular : List.of());
        tmdbResult.people().stream().filter(p -> !popularIds.contains(p.id())).forEach(people::add);
        // « Tout » : jusqu'à 3 personnes en premier, puis les titres (specs/docs/08 §8.1).
        if ("all".equals(type)) people = page == 1 ? people.stream().limit(MAX_PEOPLE_IN_ALL).toList() : List.of();
        return new SearchResult(people, tmdbResult.titles(), page, tmdbResult.totalPages());
    }

    /**
     * Peu de titres en page 1 : probable faute de frappe. On ajoute, après les résultats de TMDB, les
     * titres proches trouvés par les variantes de la requête ({@link FuzzySearch}).
     */
    private SearchResult withCloseMatches(SearchResult result, String query, String type, Prefs prefs) {
        if (result.page() != 1 || "person".equals(type) || result.titles().size() >= FUZZY_BELOW) return result;
        Set<String> seen = result.titles().stream().map(TitleLite::id).collect(Collectors.toSet());
        Map<String, Double> scores = new LinkedHashMap<>();
        Map<String, TitleLite> close = new LinkedHashMap<>();
        for (List<TitleLite> titles : facts.parallel(FuzzySearch.variants(query),
                variant -> tmdbSearch(variant, type, 1, prefs).titles())) {
            for (TitleLite title : titles) {
                double score = FuzzySearch.score(query, title);
                if (score < FuzzySearch.MIN_SCORE || seen.contains(title.id())) continue;
                scores.merge(title.id(), score, Math::max);
                close.putIfAbsent(title.id(), title);
            }
        }
        if (close.isEmpty()) return result;
        // Le plus proche d'abord ; à égalité (au dixième près), le plus populaire.
        List<TitleLite> extra = close.values().stream()
                .sorted(Comparator.comparingDouble((TitleLite t) -> -Math.round(scores.get(t.id()) * 10) / 10.0)
                        .thenComparing(Comparator.comparingDouble(
                                (TitleLite t) -> t.popularity() == null ? 0 : t.popularity()).reversed()))
                .limit(PAGE_SIZE)
                .toList();
        List<TitleLite> titles = new ArrayList<>(result.titles());
        titles.addAll(extra);
        return new SearchResult(result.people(), titles, 1, Math.max(1, result.totalPages()));
    }

    private SearchResult tmdbSearch(String query, String type, int page, Prefs prefs) {
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
        titles.sort(byRelevance(query));
        return new SearchResult(people, titles, page, body.path("total_pages").asInt(1));
    }

    /** Titre exactement égal à la requête d'abord, puis le plus populaire (« Fight Club » de 1999 avant les homonymes). */
    static Comparator<TitleLite> byRelevance(String query) {
        String wanted = query.strip().toLowerCase(Locale.ROOT);
        Comparator<TitleLite> exact = Comparator.comparing(
                t -> !wanted.equals(t.title() == null ? "" : t.title().strip().toLowerCase(Locale.ROOT)));
        return exact.thenComparing(
                Comparator.comparingDouble((TitleLite t) -> t.popularity() == null ? 0 : t.popularity()).reversed());
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
        Map<String, TitleLite> results = new LinkedHashMap<>();
        int total = 0;
        for (MediaType type : query.types()) {
            TreeMap<String, String> params = discoverParams(query, type, prefs);
            if (params == null) continue;
            for (TreeMap<String, String> variant : genreVariants(params, query, type)) {
                JsonNode body = tmdb.get("/discover/" + type.tmdbType(), variant);
                filterType(Json.map(body, "results", n -> TmdbMapper.lite(n, type.tmdbType())), type)
                        .forEach(t -> results.putIfAbsent(t.id(), t));
                total += body.path("total_results").asInt(0);
            }
        }
        List<TitleLite> sorted = new ArrayList<>(results.values());
        sorted.sort(comparator(query.sort()));
        return new DiscoverResult(sorted, total, query.page());
    }

    /**
     * Animés filtrés par genre : Animation ET le genre. TMDB ne sait pas combiner « ET » et « OU »
     * dans {@code with_genres} : un appel par genre, résultats fusionnés (le total peut compter
     * deux fois un animé de plusieurs genres).
     */
    private static List<TreeMap<String, String>> genreVariants(
            TreeMap<String, String> params, DiscoverQuery q, MediaType type) {
        if (type != MediaType.ANIME) return List.of(params);
        List<Integer> genreIds = Genres.tmdbIds(q.genres(), false).stream()
                .filter(id -> id != TmdbMapper.ANIMATION_GENRE)
                .toList();
        if (genreIds.isEmpty()) return List.of(params);
        return genreIds.stream().map(id -> {
            var variant = new TreeMap<>(params);
            variant.put("with_genres", TmdbMapper.ANIMATION_GENRE + "," + id);
            return variant;
        }).toList();
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
        if (q.studio() != null) p.put("with_companies", String.valueOf(q.studio()));
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
                // Sans seuil, les plus récents sont des titres confidentiels sans aucun vote.
                p.putIfAbsent("vote_count.gte", RECENT_MIN_VOTES);
            }
            default -> p.put("sort_by", "popularity.desc");
        }
        return p;
    }

    private static final String RECENT_MIN_VOTES = "10";

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
                // Ensemble à l'écran : pas sur le plateau d'un talk-show ni d'une cérémonie.
                if (("movie".equals(mediaType) || "tv".equals(mediaType)) && isActingRole(work, mediaType)) {
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
        if (movie && ("new_seasons".equals(list) || "season_anime".equals(list))
                || "season_anime".equals(list) && type != MediaType.ANIME) {
            throw ApiException.badRequest("Liste indisponible pour ce type : " + list);
        }
        switch (list) {
            case "new_seasons" -> {
                return bySeason(base, type, today, d -> seasonStartsNear(d, today));
            }
            case "season_anime" -> {
                return bySeason(base, type, today, DiscoverService::seasonInProgress);
            }
            case "trending" -> {
                if (type == MediaType.ANIME) return animeTrending(base, page);
            }
            default -> { }
        }
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
            default -> throw ApiException.badRequest("Liste inconnue : " + list);
        };
        if (body == null) return new DiscoverResult(List.of(), 0, page);

        List<TitleLite> results = filterType(Json.map(body, "results", n -> TmdbMapper.lite(n, type.tmdbType())), type);
        // Tendances films : hors titres pas encore sortis.
        if ("trending".equals(list) && movie) {
            results = results.stream().filter(t -> t.releaseDate() == null || !t.releaseDate().isAfter(today)).toList();
        }
        // Bientôt en salle : TMDB y laisse des films déjà sortis (parfois déjà en streaming).
        if ("upcoming".equals(list)) {
            results = results.stream().filter(t -> t.releaseDate() != null && t.releaseDate().isAfter(today)).toList();
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

    /**
     * Séries diffusées autour d'aujourd'hui (un épisode dans les 7 jours, avant ou après),
     * gardées si leur fiche vérifie {@code keep}. TMDB ne filtre pas par date de saison.
     */
    private DiscoverResult bySeason(
            TreeMap<String, String> base, MediaType type, LocalDate today, Predicate<JsonNode> keep) {
        List<TitleLite> candidates = new ArrayList<>();
        for (int page = 1; page <= SEASON_CANDIDATE_PAGES; page++) {
            JsonNode body = tmdb.get("/discover/tv", animeFilter(type, with(base,
                    "page", String.valueOf(page),
                    "air_date.gte", today.minusDays(7).toString(),
                    "air_date.lte", today.plusDays(7).toString(),
                    "sort_by", "popularity.desc")));
            candidates.addAll(filterType(Json.map(body, "results", n -> TmdbMapper.lite(n, "tv")), type));
            if (page >= body.path("total_pages").asInt(1)) break;
        }
        List<TitleLite> kept = facts.parallel(candidates,
                        t -> keep.test(facts.facts(MediaType.TV, t.tmdbId())) ? t : null).stream()
                .limit(PAGE_SIZE)
                .toList();
        return new DiscoverResult(kept, kept.size(), 1);
    }

    /** Nouvelle saison : une saison (hors spéciaux) commence dans les 7 jours, avant ou après. */
    static boolean seasonStartsNear(JsonNode tv, LocalDate today) {
        return Json.array(tv, "seasons").stream().anyMatch(season -> {
            LocalDate start = TmdbMapper.date(Json.text(season, "air_date"));
            return season.path("season_number").asInt(0) > 0
                    && start != null
                    && !start.isBefore(today.minusDays(7))
                    && !start.isAfter(today.plusDays(7));
        });
    }

    /** Saison en cours : le dernier épisode diffusé et le prochain sont de la même saison. */
    static boolean seasonInProgress(JsonNode tv) {
        JsonNode last = tv.path("last_episode_to_air");
        JsonNode next = tv.path("next_episode_to_air");
        if (!last.isObject() || !next.isObject()) return false;
        int season = last.path("season_number").asInt(-1);
        return season > 0 && season == next.path("season_number").asInt(-2);
    }

    /**
     * Tendances des animés : peu d'animés parmi les séries tendance ; on lit plusieurs pages,
     * puis on complète avec les animés populaires.
     */
    private DiscoverResult animeTrending(TreeMap<String, String> base, int page) {
        if (page > 1) return new DiscoverResult(List.of(), 0, page);
        Map<String, TitleLite> results = new LinkedHashMap<>();
        for (int p = 1; p <= ANIME_TRENDING_PAGES && results.size() < PAGE_SIZE; p++) {
            JsonNode body = tmdb.get("/trending/tv/week", with(base, "page", String.valueOf(p)));
            filterType(Json.map(body, "results", n -> TmdbMapper.lite(n, "tv")), MediaType.ANIME)
                    .forEach(t -> results.putIfAbsent(t.id(), t));
        }
        if (results.size() < PAGE_SIZE) {
            JsonNode popular = tmdb.get("/discover/tv", animeFilter(MediaType.ANIME, with(base,
                    "page", "1",
                    "sort_by", "popularity.desc")));
            filterType(Json.map(popular, "results", n -> TmdbMapper.lite(n, "tv")), MediaType.ANIME)
                    .forEach(t -> results.putIfAbsent(t.id(), t));
        }
        List<TitleLite> list = results.values().stream().limit(PAGE_SIZE).toList();
        return new DiscoverResult(list, list.size(), 1);
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
        Map<String, String> characters = new LinkedHashMap<>();
        for (JsonNode work : Json.array(body.path("combined_credits"), "cast")) {
            String mediaType = Json.text(work, "media_type");
            if (!"movie".equals(mediaType) && !"tv".equals(mediaType)) continue;
            if (!isActingRole(work, mediaType)) continue;
            TitleLite lite = TmdbMapper.lite(work, mediaType);
            credits.putIfAbsent(lite.id(), lite);
            String character = Json.text(work, "character");
            if (character != null) characters.putIfAbsent(lite.id(), character);
        }
        // Réalisation et scénario : la filmographie d'un réalisateur n'a pas de rôle d'acteur.
        for (JsonNode work : Json.array(body.path("combined_credits"), "crew")) {
            String mediaType = Json.text(work, "media_type");
            if (!"movie".equals(mediaType) && !"tv".equals(mediaType)) continue;
            if (!AUTHOR_JOBS.contains(Json.text(work, "job"))) continue;
            TitleLite lite = TmdbMapper.lite(work, mediaType);
            credits.putIfAbsent(lite.id(), lite);
        }
        List<TitleLite> sorted = credits.values().stream()
                .sorted(comparator("pop"))
                .collect(Collectors.toCollection(ArrayList::new));
        List<Role> roles = sorted.stream()
                .filter(t -> characters.containsKey(t.id()) && t.title() != null)
                .limit(ROLES_IN_BIO)
                .map(t -> new Role(t.title(), characters.get(t.id())))
                .toList();
        return new PersonDetail(
                id,
                Json.text(body, "name"),
                Json.text(body, "profile_path"),
                Json.integer(body, "gender"),
                TmdbMapper.date(Json.text(body, "birthday")),
                Json.text(body, "place_of_birth"),
                biography,
                sorted,
                roles);
    }

    private static final Set<String> AUTHOR_JOBS =
            Set.of("Director", "Screenplay", "Writer", "Story", "Novel", "Creator");

    /** Filmographie : sans talk-shows, actualités, téléréalité ni apparitions en son propre nom. */
    private static boolean isActingRole(JsonNode work, String mediaType) {
        String character = Json.text(work, "character");
        if (character != null && SELF.matcher(character.trim()).matches()) return false;
        return !"tv".equals(mediaType) || TmdbMapper.genreIds(work).stream().noneMatch(NON_FICTION_TV::contains);
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
