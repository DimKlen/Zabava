package com.zabava.api.catalog;

import java.util.Arrays;
import java.util.List;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.zabava.api.auth.CurrentUser;
import com.zabava.api.catalog.DiscoverService.DiscoverQuery;
import com.zabava.api.catalog.dto.CatalogDtos.Count;
import com.zabava.api.catalog.dto.CatalogDtos.DiscoverResult;
import com.zabava.api.catalog.dto.CatalogDtos.Episode;
import com.zabava.api.catalog.dto.CatalogDtos.PersonDetail;
import com.zabava.api.catalog.dto.CatalogDtos.Provider;
import com.zabava.api.catalog.dto.CatalogDtos.SearchResult;
import com.zabava.api.catalog.dto.CatalogDtos.SeasonDetail;
import com.zabava.api.catalog.dto.CatalogDtos.TitleBadge;
import com.zabava.api.catalog.dto.CatalogDtos.TitleDetail;
import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;
import com.zabava.api.common.ApiException;
import com.zabava.api.common.MediaType;
import com.zabava.api.common.TitleRef;
import com.zabava.api.me.ProfileService;
import com.zabava.api.me.ProfileService.Prefs;
import com.zabava.api.providers.ProviderService;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Catalogue : recherche, Découvrir, fiches, saisons, personnes, plateformes (specs/docs/11 §3). */
@RestController
@RequestMapping("/api/v1")
@Validated
public class CatalogController {

    /** Affiches visibles d'une grille ou d'un carrousel, demandées en un appel. */
    static final int MAX_BADGE_IDS = 60;

    private final DiscoverService discover;
    private final TitleService titles;
    private final TitleFacts facts;
    private final ProviderService providers;
    private final ProfileService profiles;

    public CatalogController(
            DiscoverService discover,
            TitleService titles,
            TitleFacts facts,
            ProviderService providers,
            ProfileService profiles) {
        this.discover = discover;
        this.titles = titles;
        this.facts = facts;
        this.providers = providers;
        this.profiles = profiles;
    }

    @GetMapping("/search")
    public SearchResult search(
            CurrentUser user,
            @RequestParam @NotBlank String q,
            @RequestParam(defaultValue = "all") @Pattern(regexp = "all|movie|tv|anime|person") String type,
            @RequestParam(defaultValue = "1") @Min(1) @Max(500) int page) {
        return discover.search(q.trim(), type, page, prefs(user));
    }

    /** Recherche avancée (filtres) ou carrousel de Découvrir ({@code list}). */
    @GetMapping("/discover")
    public DiscoverResult discover(
            CurrentUser user,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String genres,
            @RequestParam(required = false) String cast,
            @RequestParam(required = false) @Min(1900) @Max(2100) Integer yearFrom,
            @RequestParam(required = false) @Min(1900) @Max(2100) Integer yearTo,
            @RequestParam(required = false) @Min(0) @Max(10) Double minRating,
            @RequestParam(required = false) String providers,
            @RequestParam(required = false) @Pattern(regexp = "[a-z]{2}") String lang,
            @RequestParam(required = false) @Min(1) Integer maxRuntime,
            @RequestParam(defaultValue = "pop") @Pattern(regexp = "pop|rating|recent") String sort,
            @RequestParam(defaultValue = "1") @Min(1) @Max(500) int page,
            @RequestParam(required = false)
                    @Pattern(regexp = "trending|now_playing|upcoming|new_on_mine|top_rated|new_seasons|popular_on_mine|season_anime")
                    String list) {
        Prefs prefs = prefs(user);
        if (list != null) return discover.list(list, MediaType.parse(type == null ? "movie" : type), page, prefs);
        return discover.discover(query(type, genres, cast, yearFrom, yearTo, minRating, providers, lang, maxRuntime, sort, page), prefs);
    }

    /** Compteur en direct de la recherche avancée (« Voir les N résultats »). */
    @GetMapping("/discover/count")
    public Count count(
            CurrentUser user,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String genres,
            @RequestParam(required = false) String cast,
            @RequestParam(required = false) @Min(1900) @Max(2100) Integer yearFrom,
            @RequestParam(required = false) @Min(1900) @Max(2100) Integer yearTo,
            @RequestParam(required = false) @Min(0) @Max(10) Double minRating,
            @RequestParam(required = false) String providers,
            @RequestParam(required = false) @Pattern(regexp = "[a-z]{2}") String lang,
            @RequestParam(required = false) @Min(1) Integer maxRuntime) {
        return new Count(discover.count(
                query(type, genres, cast, yearFrom, yearTo, minRating, providers, lang, maxRuntime, "pop", 1), prefs(user)));
    }

    /**
     * Données de badge des affiches ({@code ids} : « movie-603,tv-1399 »). Les listes TMDB
     * (Découvrir, filmographie, genre) n'ont ni plateformes ni date de sortie dans la région.
     */
    @GetMapping("/titles/badges")
    public List<TitleBadge> badges(CurrentUser user, @RequestParam @NotBlank String ids) {
        List<TitleRef> refs = csv(ids).stream().map(TitleRef::parse).distinct().toList();
        if (refs.size() > MAX_BADGE_IDS) throw ApiException.badRequest("Au plus " + MAX_BADGE_IDS + " titres");
        return facts.badges(refs, prefs(user).region());
    }

    @GetMapping("/titles/{type}/{tmdbId}")
    public TitleDetail title(
            CurrentUser user,
            @PathVariable @Pattern(regexp = "movie|tv|anime") String type,
            @PathVariable int tmdbId) {
        return titles.detail(new TitleRef(MediaType.parse(type), tmdbId), prefs(user));
    }

    @GetMapping("/titles/{type}/{tmdbId}/episodes")
    public List<Episode> episodes(
            CurrentUser user,
            @PathVariable @Pattern(regexp = "tv|anime") String type,
            @PathVariable int tmdbId) {
        return titles.allEpisodes(new TitleRef(MediaType.parse(type), tmdbId), prefs(user));
    }

    @GetMapping("/titles/tv/{tmdbId}/seasons/{number}")
    public SeasonDetail season(CurrentUser user, @PathVariable int tmdbId, @PathVariable @Min(0) int number) {
        return titles.season(tmdbId, number, prefs(user));
    }

    @GetMapping("/people/{id}")
    public PersonDetail person(CurrentUser user, @PathVariable int id) {
        return discover.person(id, prefs(user));
    }

    @GetMapping("/trending")
    public List<TitleLite> trending(
            CurrentUser user,
            @RequestParam(defaultValue = "all") @Pattern(regexp = "all|movie|tv|anime") String type,
            @RequestParam(defaultValue = "week") @Pattern(regexp = "day|week") String window) {
        return discover.trending(type, window, prefs(user));
    }

    /** Plateformes d'abonnement de la région du profil. */
    @GetMapping("/providers")
    public List<Provider> providers(CurrentUser user) {
        return providers.forRegion(prefs(user).region());
    }

    private Prefs prefs(CurrentUser user) {
        return profiles.prefs(user.id());
    }

    private static DiscoverQuery query(
            String type, String genres, String cast, Integer yearFrom, Integer yearTo, Double minRating,
            String providers, String lang, Integer maxRuntime, String sort, int page) {
        List<MediaType> types = csv(type).stream().map(MediaType::parse).distinct().toList();
        if (types.isEmpty()) types = List.of(MediaType.MOVIE, MediaType.TV, MediaType.ANIME);
        List<String> genreKeys = csv(genres);
        genreKeys.forEach(Genres::byKey);
        List<Integer> castIds = csv(cast).stream().map(Integer::valueOf).toList();
        return new DiscoverQuery(types, genreKeys, castIds, yearFrom, yearTo, minRating, providers, lang, maxRuntime, sort, page);
    }

    private static List<String> csv(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
