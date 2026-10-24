package com.zabava.api.catalog;

import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.zabava.api.IntegrationTest;

/**
 * Étape 7 : personnes trouvées par début de nom, badges des affiches, animés par genre,
 * listes de Découvrir fondées sur les saisons, filmographie. Aujourd'hui = 11 octobre 2026.
 */
class SearchAndListsIT extends IntegrationTest {

    /** TMDB ne trouve que des mots entiers : « zen » ne renvoie jamais Zendaya. */
    private static final String MULTI_WITHOUT_ZENDAYA = """
            {"page": 1, "total_pages": 182, "results": [
              {"id": 7, "media_type": "tv", "name": "Zen", "first_air_date": "2011-01-02", "genre_ids": [80], "origin_country": ["GB"]},
              {"id": 900, "media_type": "person", "name": "Zen", "known_for": [{"title": "Auto Focus"}]}
            ]}
            """;

    private static final String POPULAR_PEOPLE = """
            {"page": 1, "total_pages": 500, "results": [
              {"id": 1, "name": "Tom Hanks", "popularity": 30, "known_for": [{"title": "Forrest Gump"}]},
              {"id": 505710, "name": "Zendaya", "popularity": 15.4,
               "known_for": [{"title": "Dune"}, {"title": "Spider-Man"}, {"title": "Challengers"}]},
              {"id": 3, "name": "Zoë Kravitz", "popularity": 12, "known_for": [{"title": "The Batman"}]},
              {"id": 4, "name": "Hidden", "adult": true, "popularity": 99, "known_for": []}
            ]}
            """;

    @Autowired
    private PopularPeople popularPeople;

    private UUID user;

    @BeforeEach
    void setUp() {
        user = createUser("alice@example.com");
    }

    @AfterEach
    void clearIndex() {
        popularPeople.load(0);
    }

    private void loadPopularPeople() {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/popular")).willReturn(okJson(POPULAR_PEOPLE)));
        popularPeople.load(1);
    }

    // ─── Recherche de personnes ───────────────────────────────────────────────

    @Test
    void zenTrouveZendayaDansToutEtDansPersonnes() throws Exception {
        loadPopularPeople();
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/multi")).willReturn(okJson(MULTI_WITHOUT_ZENDAYA)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/person")).willReturn(okJson("""
                {"page": 1, "total_pages": 104, "results": [
                  {"id": 900, "name": "Zen", "known_for": []}, {"id": 505710, "name": "Zendaya", "known_for": []}]}
                """)));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=zen")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.people[*].name", contains("Zendaya", "Zen")))
                .andExpect(jsonPath("$.people[0].knownFor", contains("Dune", "Spider-Man")))
                .andExpect(jsonPath("$.titles[*].id", contains("tv-7")));

        // Personnes : l'index d'abord, puis TMDB sans doublon.
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=Zen&type=person")))
                .andExpect(jsonPath("$.people[*].id", contains(505710, 900)));
        // Pages suivantes : TMDB seulement.
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=zen&type=person&page=2")))
                .andExpect(jsonPath("$.people[*].id", contains(900)));
    }

    @Test
    void personnesParDebutDeMotSansAccentNiAdulte() throws Exception {
        loadPopularPeople();
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/person")).willReturn(okJson("{\"results\": []}")));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=kravi&type=person")))
                .andExpect(jsonPath("$.people[*].name", contains("Zoë Kravitz")));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=zoe&type=person")))
                .andExpect(jsonPath("$.people[*].name", contains("Zoë Kravitz")));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?type=person").param("q", "tom ha")))
                .andExpect(jsonPath("$.people[*].name", contains("Tom Hanks")));
        // Une lettre ne suffit pas ; les fiches adultes sont ignorées.
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=z&type=person")))
                .andExpect(jsonPath("$.people", hasSize(0)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=hid&type=person")))
                .andExpect(jsonPath("$.people", hasSize(0)));
    }

    @Test
    void toutGardeTroisPersonnesAuPlus() throws Exception {
        loadPopularPeople();
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/multi")).willReturn(okJson("""
                {"results": [
                  {"id": 11, "media_type": "person", "name": "Z 1"}, {"id": 12, "media_type": "person", "name": "Z 2"},
                  {"id": 13, "media_type": "person", "name": "Z 3"}]}
                """)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=zen")))
                .andExpect(jsonPath("$.people[*].id", contains(505710, 11, 12)));
    }

    // ─── Fautes de frappe ─────────────────────────────────────────────────────

    @Test
    void uneFauteDeFrappeTrouveQuandMemeLeTitre() throws Exception {
        // TMDB exige chaque mot : « tous » au lieu de « tout » ne renvoie rien…
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/movie")).willReturn(okJson("{\"results\": []}")));
        // … mais sans ce mot, le film sort, avec un homonyme éloigné qui doit être écarté.
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/movie"))
                .withQueryParam("query", equalTo("le diable le temps"))
                .willReturn(okJson("""
                        {"page": 1, "total_pages": 1, "results": [
                          {"id": 499932, "title": "Le Diable, tout le temps", "popularity": 9},
                          {"id": 350, "title": "Le Diable s'habille en Prada", "popularity": 40}]}
                        """)));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?type=movie")
                        .param("q", "le diable tous le temps")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titles[*].id", contains("movie-499932")))
                .andExpect(jsonPath("$.totalPages").value(1));
        // Les pages suivantes ne relancent pas les variantes.
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?type=movie&page=2")
                        .param("q", "le diable tous le temps")))
                .andExpect(jsonPath("$.titles", hasSize(0)));
    }

    @Test
    void assezDeResultatsPasDeVariante() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/movie")).willReturn(okJson("""
                {"page": 1, "total_pages": 3, "results": [
                  {"id": 1, "title": "Dune A"}, {"id": 2, "title": "Dune B"}, {"id": 3, "title": "Dune C"},
                  {"id": 4, "title": "Dune D"}, {"id": 5, "title": "Dune E"}]}
                """)));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?type=movie").param("q", "dune part")))
                .andExpect(jsonPath("$.titles", hasSize(5)));
        WIREMOCK.verify(1, getRequestedFor(urlPathEqualTo("/tmdb/search/movie")));
    }

    // ─── Badges ───────────────────────────────────────────────────────────────

    @Test
    void badgesDesAffiches() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/movie/603"))
                .withQueryParam("append_to_response", equalTo("release_dates,watch/providers"))
                .willReturn(okJson(fixture("tmdb-movie-603.json"))));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/tv/1399"))
                .withQueryParam("append_to_response", equalTo("watch/providers"))
                .willReturn(okJson(fixture("tmdb-tv-1399.json"))));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/titles/badges?ids=movie-603,tv-1399,movie-404")))
                .andExpect(status().isOk())
                // Un titre introuvable (404 TMDB) est omis.
                .andExpect(jsonPath("$[*].id", contains("movie-603", "tv-1399")))
                .andExpect(jsonPath("$[0].releaseTheatrical").value("2026-10-20"))
                .andExpect(jsonPath("$[0].availability.sub[0].name").value("Netflix"))
                .andExpect(jsonPath("$[0].availability.rent[0].name").value("Apple TV"))
                .andExpect(jsonPath("$[1].network").value("FX"))
                .andExpect(jsonPath("$[1].ended").value(false))
                .andExpect(jsonPath("$[1].availability.sub[0].name").value("Disney Plus"));
    }

    @Test
    void discoverJointLesBadges() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/movie/now_playing")).willReturn(okJson("""
                {"total_results": 2, "results": [{"id": 603, "title": "L'Odyssée"}, {"id": 404, "title": "Inconnu"}]}
                """)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/movie/603"))
                .withQueryParam("append_to_response", equalTo("release_dates,watch/providers"))
                .willReturn(okJson(fixture("tmdb-movie-603.json"))));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=now_playing&type=movie")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[0].badge.releaseTheatrical").value("2026-10-20"))
                .andExpect(jsonPath("$.results[0].badge.availability.sub[0].name").value("Netflix"))
                // Fiche introuvable : titre gardé, sans badge.
                .andExpect(jsonPath("$.results[1].id").value("movie-404"))
                .andExpect(jsonPath("$.results[1].badge").doesNotExist());
        // Le compteur de la recherche avancée ne charge pas les fiches.
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/movie")).willReturn(okJson("""
                {"total_results": 1, "results": [{"id": 777, "title": "X"}]}
                """)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover/count?type=movie")))
                .andExpect(jsonPath("$.total").value(1));
        WIREMOCK.verify(0, getRequestedFor(urlPathEqualTo("/tmdb/movie/777")));
    }

    @Test
    void badgesLimitesEtIdentifiantsValides() throws Exception {
        String tooMany = String.join(",", java.util.stream.IntStream.rangeClosed(1, 61).mapToObj(i -> "movie-" + i).toList());
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/titles/badges?ids=" + tooMany)))
                .andExpect(status().isBadRequest());
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/titles/badges?ids=film-1")))
                .andExpect(status().isBadRequest());
    }

    // ─── Animés par genre ─────────────────────────────────────────────────────

    @Test
    void animesParGenreUnAppelParGenre() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/tv"))
                .withQueryParam("with_genres", equalTo("16,10759"))
                .willReturn(okJson("""
                        {"total_results": 2, "results": [
                          {"id": 1, "name": "Action", "genre_ids": [16, 10759], "origin_country": ["JP"], "popularity": 50},
                          {"id": 2, "name": "Les deux", "genre_ids": [16, 10759, 10765], "origin_country": ["JP"], "popularity": 90}]}
                        """)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/tv"))
                .withQueryParam("with_genres", equalTo("16,10765"))
                .willReturn(okJson("""
                        {"total_results": 1, "results": [
                          {"id": 2, "name": "Les deux", "genre_ids": [16, 10759, 10765], "origin_country": ["JP"], "popularity": 90}]}
                        """)));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?type=anime&genres=action,fantastique")))
                .andExpect(jsonPath("$.results[*].id", contains("anime-2", "anime-1")))
                .andExpect(jsonPath("$.total").value(3));
        // Un seul genre (liste par genre) : Animation ET ce genre.
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?type=anime&genres=action")))
                .andExpect(jsonPath("$.total").value(2));
        // « Animation » pour les animés : pas de doublon de genre.
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/tv"))
                .withQueryParam("with_genres", equalTo("16"))
                .willReturn(okJson("{\"total_results\": 5536, \"results\": []}")));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover/count?type=anime&genres=animation")))
                .andExpect(jsonPath("$.total").value(5536));
    }

    // ─── Listes fondées sur les saisons ───────────────────────────────────────

    private static void stubAiringThisWeek() {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/tv")).willReturn(okJson("""
                {"page": 1, "total_pages": 1, "results": [
                  {"id": 1, "name": "Nouvelle saison", "genre_ids": [16], "origin_country": ["JP"], "popularity": 90},
                  {"id": 2, "name": "Saison en cours", "genre_ids": [16], "origin_country": ["JP"], "popularity": 80},
                  {"id": 3, "name": "Rediffusion", "genre_ids": [16], "origin_country": ["JP"], "popularity": 70}]}
                """)));
        // Saison 2 commencée le 6 octobre ; deux épisodes de la saison 2 de part et d'autre d'aujourd'hui.
        stubTv(1, """
                {"id": 1, "seasons": [{"season_number": 0, "air_date": "2026-10-10"},
                  {"season_number": 1, "air_date": "2024-01-01"}, {"season_number": 2, "air_date": "2026-10-06"}],
                 "last_episode_to_air": {"season_number": 2, "episode_number": 1},
                 "next_episode_to_air": {"season_number": 2, "episode_number": 2}}
                """);
        // Saison 3 commencée en juillet, encore en diffusion.
        stubTv(2, """
                {"id": 2, "seasons": [{"season_number": 3, "air_date": "2026-07-05"}],
                 "last_episode_to_air": {"season_number": 3, "episode_number": 14},
                 "next_episode_to_air": {"season_number": 3, "episode_number": 15}}
                """);
        // Spécial (saison 0) diffusé cette semaine, aucune saison en cours.
        stubTv(3, """
                {"id": 3, "seasons": [{"season_number": 0, "air_date": "2026-10-09"}, {"season_number": 1, "air_date": "2019-04-01"}],
                 "last_episode_to_air": {"season_number": 0, "episode_number": 3}, "next_episode_to_air": null}
                """);
    }

    private static void stubTv(int id, String body) {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/tv/" + id))
                .withQueryParam("append_to_response", equalTo("watch/providers"))
                .willReturn(okJson(body)));
    }

    @Test
    void nouvellesSaisonsCetteSemaine() throws Exception {
        stubAiringThisWeek();
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=new_seasons&type=anime")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.results[*].id", contains("anime-1")));
        WIREMOCK.verify(getRequestedFor(urlPathEqualTo("/tmdb/discover/tv"))
                .withQueryParam("air_date.gte", equalTo("2026-10-04"))
                .withQueryParam("air_date.lte", equalTo("2026-10-18"))
                .withQueryParam("with_genres", equalTo("16")));
    }

    @Test
    void animesDeLaSaisonEnCours() throws Exception {
        stubAiringThisWeek();
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=season_anime&type=anime")))
                .andExpect(jsonPath("$.results[*].id", contains("anime-1", "anime-2")));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=season_anime&type=tv")))
                .andExpect(status().isBadRequest());
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=new_seasons&type=movie")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void tendancesAnimesCompleteesParLesPopulaires() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/trending/tv/week")).willReturn(okJson("""
                {"results": [
                  {"id": 1399, "name": "The Bear", "genre_ids": [18], "origin_country": ["US"]},
                  {"id": 209867, "name": "Frieren", "genre_ids": [16], "origin_country": ["JP"]}]}
                """)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/tv")).willReturn(okJson("""
                {"results": [
                  {"id": 209867, "name": "Frieren", "genre_ids": [16], "origin_country": ["JP"]},
                  {"id": 5, "name": "Dandadan", "genre_ids": [16], "origin_country": ["JP"]}]}
                """)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=trending&type=anime")))
                .andExpect(jsonPath("$.results[*].id", contains("anime-209867", "anime-5")));
    }

    @Test
    void bientotEnSalleSansFilmsDejaSortis() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/movie/upcoming")).willReturn(okJson("""
                {"total_results": 3, "results": [
                  {"id": 1, "title": "Sorti", "release_date": "2026-09-20"},
                  {"id": 2, "title": "Aujourd'hui", "release_date": "2026-10-11"},
                  {"id": 3, "title": "Bientôt", "release_date": "2026-10-30"},
                  {"id": 4, "title": "Sans date"}]}
                """)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=upcoming&type=movie")))
                .andExpect(jsonPath("$.results[*].id", contains("movie-3")));
    }

    @Test
    void acteursEnsembleSansTalkShowsNiCeremonies() throws Exception {
        String credits = """
                {"cast": [
                  {"id": 100, "media_type": "movie", "title": "Spider-Man", "character": "%s", "popularity": 50},
                  {"id": 200, "media_type": "tv", "name": "Tonight Show", "genre_ids": [10767], "character": "Guest"},
                  {"id": 300, "media_type": "tv", "name": "MTV Awards", "genre_ids": [], "character": "%s"}]}
                """;
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/1/combined_credits"))
                .willReturn(okJson(credits.formatted("MJ", "Self - Presenter"))));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/2/combined_credits"))
                .willReturn(okJson(credits.formatted("Peter Parker", "Himself"))));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?cast=1,2")))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.results[*].id", contains("movie-100")));
    }

    // ─── Fiche personne ───────────────────────────────────────────────────────

    @Test
    void filmographieSansTalkShowsAvecRoles() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/505710")).willReturn(okJson("""
                {"id": 505710, "name": "Zendaya", "gender": 1, "biography": "Actrice.",
                 "combined_credits": {"cast": [
                   {"id": 85552, "media_type": "tv", "name": "Euphoria", "popularity": 90, "genre_ids": [18], "character": "Rue Bennett"},
                   {"id": 22, "media_type": "tv", "name": "Talk-show", "popularity": 300, "genre_ids": [10767], "character": "Guest"},
                   {"id": 23, "media_type": "movie", "title": "Oscars", "popularity": 200, "character": "Self - Presenter"},
                   {"id": 603, "media_type": "movie", "title": "Dune", "popularity": 400, "character": "Chani"},
                   {"id": 24, "media_type": "movie", "title": "Sans rôle", "popularity": 10}]}}
                """)));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/people/505710")))
                .andExpect(jsonPath("$.credits[*].id", contains("movie-603", "tv-85552", "movie-24")))
                .andExpect(jsonPath("$.roles[*].title", contains("Dune", "Euphoria")))
                .andExpect(jsonPath("$.roles[*].character", contains("Chani", "Rue Bennett")));
    }
}
