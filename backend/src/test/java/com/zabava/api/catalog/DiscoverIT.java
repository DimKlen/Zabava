package com.zabava.api.catalog;

import static com.github.tomakehurst.wiremock.client.WireMock.absent;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.matching;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.zabava.api.IntegrationTest;

/** GET /search, /discover, /discover/count, /trending, /people/{id}. */
class DiscoverIT extends IntegrationTest {

    private static final String RESULTS = """
            {"page": 1, "total_pages": 3, "total_results": 42, "results": [
              {"id": 505710, "media_type": "person", "name": "Zendaya", "profile_path": "/z.jpg",
               "known_for": [{"title": "Dune"}, {"name": "Euphoria"}, {"title": "Challengers"}]},
              {"id": 603, "media_type": "movie", "title": "L'Odyssée", "release_date": "2026-07-17", "popularity": 400},
              {"id": 85552, "media_type": "tv", "name": "Euphoria", "first_air_date": "2019-06-16",
               "genre_ids": [18], "origin_country": ["US"], "popularity": 90},
              {"id": 209867, "media_type": "tv", "name": "Frieren", "first_air_date": "2023-09-29",
               "genre_ids": [16, 10765], "origin_country": ["JP"], "popularity": 120},
              {"id": 1, "media_type": "person", "name": "Zen Gesner", "known_for": []},
              {"id": 2, "media_type": "person", "name": "Zendaya Coleman", "known_for": []},
              {"id": 3, "media_type": "person", "name": "Zenon", "known_for": []}
            ]}
            """;

    private UUID user;

    @BeforeEach
    void setUp() {
        user = createUser("alice@example.com");
    }

    @Test
    void rechercheToutPersonnesPuisTitres() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/multi")).willReturn(okJson(RESULTS)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=zen")))
                .andExpect(status().isOk())
                // Jusqu'à 3 personnes, avec 2 titres connus.
                .andExpect(jsonPath("$.people", hasSize(3)))
                .andExpect(jsonPath("$.people[0].name").value("Zendaya"))
                .andExpect(jsonPath("$.people[0].knownFor", contains("Dune", "Euphoria")))
                // Par popularité décroissante.
                .andExpect(jsonPath("$.titles[*].id", contains("movie-603", "anime-209867", "tv-85552")))
                .andExpect(jsonPath("$.titles[0].year").value(2026))
                .andExpect(jsonPath("$.totalPages").value(3));
        WIREMOCK.verify(getRequestedFor(urlPathEqualTo("/tmdb/search/multi"))
                .withQueryParam("query", equalTo("zen"))
                // Profil en fr-CA : TMDB reçoit le français de France (traductions bien plus complètes).
                .withQueryParam("language", equalTo("fr-FR"))
                .withQueryParam("include_adult", equalTo("false"))
                .withHeader("Authorization", equalTo("Bearer eyJ-test-v4-read-access-token-longer-than-32-characters")));
    }

    @Test
    void rechercheAnimesSeulement() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/search/tv")).willReturn(okJson(RESULTS.replace("\"media_type\": \"tv\", ", ""))));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/search?q=fri&type=anime")))
                .andExpect(jsonPath("$.titles[*].id", contains("anime-209867")))
                .andExpect(jsonPath("$.people", hasSize(0)));
    }

    @Test
    void decouvrirAvecFiltres() throws Exception {
        mvc.perform(as(user, put("/api/v1/me/providers"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"providerIds\": [8, 230]}"))
                .andExpect(status().isNoContent());
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/movie")).willReturn(okJson("""
                {"page": 1, "total_results": 2, "results": [
                  {"id": 10, "title": "B", "popularity": 5}, {"id": 11, "title": "A", "popularity": 50}]}
                """)));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?type=movie&genres=action,thriller"
                        + "&yearFrom=1990&yearTo=2026&minRating=7.5&providers=mine&lang=ja&maxRuntime=120&sort=pop")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.results[*].id", contains("movie-11", "movie-10")));

        WIREMOCK.verify(getRequestedFor(urlPathEqualTo("/tmdb/discover/movie"))
                .withQueryParam("with_genres", equalTo("28|53"))
                .withQueryParam("primary_release_date.gte", equalTo("1990-01-01"))
                .withQueryParam("primary_release_date.lte", equalTo("2026-12-31"))
                .withQueryParam("vote_average.gte", equalTo("7.5"))
                .withQueryParam("with_watch_providers", equalTo("8|230"))
                .withQueryParam("watch_region", equalTo("CA"))
                .withQueryParam("with_watch_monetization_types", equalTo("flatrate"))
                .withQueryParam("with_original_language", equalTo("ja"))
                .withQueryParam("with_runtime.lte", equalTo("120"))
                .withQueryParam("sort_by", equalTo("popularity.desc")));
    }

    @Test
    void decouvrirAnimesEtSeriesSepares() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/tv")).willReturn(okJson("""
                {"total_results": 2, "results": [
                  {"id": 209867, "name": "Frieren", "genre_ids": [16], "origin_country": ["JP"]},
                  {"id": 1399, "name": "The Bear", "genre_ids": [18], "origin_country": ["US"]}]}
                """)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?type=anime")))
                .andExpect(jsonPath("$.results[*].id", contains("anime-209867")));
        WIREMOCK.verify(getRequestedFor(urlPathEqualTo("/tmdb/discover/tv"))
                .withQueryParam("with_genres", equalTo("16"))
                .withQueryParam("with_origin_country", equalTo("JP")));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?type=tv")))
                .andExpect(jsonPath("$.results[*].id", contains("tv-1399")));
    }

    @Test
    void plusRecentsSortisAvecUnMinimumDeVotes() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/movie")).willReturn(okJson("{\"total_results\": 0, \"results\": []}")));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?type=movie&genres=animation&sort=recent")))
                .andExpect(status().isOk());
        WIREMOCK.verify(getRequestedFor(urlPathEqualTo("/tmdb/discover/movie"))
                .withQueryParam("sort_by", equalTo("primary_release_date.desc"))
                .withQueryParam("primary_release_date.lte", matching("\\d{4}-\\d{2}-\\d{2}"))
                .withQueryParam("vote_count.gte", equalTo("10")));
    }

    @Test
    void mesPlateformesSansPlateformeChoisieNeDonneRien() throws Exception {
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?type=movie&providers=mine")))
                .andExpect(jsonPath("$.total").value(0));
        WIREMOCK.verify(0, getRequestedFor(urlPathEqualTo("/tmdb/discover/movie")));
    }

    @Test
    void compteurAdditionneLesTypes() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/movie")).willReturn(okJson("{\"total_results\": 120, \"results\": []}")));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/discover/tv")).willReturn(okJson("{\"total_results\": 30, \"results\": []}")));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover/count?type=movie,tv&genres=drame")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(150));
    }

    @Test
    void genreInconnuRefuse() throws Exception {
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?genres=western")))
                .andExpect(status().isBadRequest());
    }

    /** Deux acteurs choisis : seuls les titres où ils jouent ensemble (specs/docs/08 §8.2). */
    @Test
    void acteursEnsemble() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/1/combined_credits")).willReturn(okJson("""
                {"cast": [
                  {"id": 100, "media_type": "movie", "title": "Ensemble", "release_date": "2020-01-01", "popularity": 10},
                  {"id": 101, "media_type": "movie", "title": "Seul 1", "release_date": "2021-01-01"},
                  {"id": 200, "media_type": "tv", "name": "Série commune", "first_air_date": "2019-01-01",
                   "genre_ids": [18], "origin_country": ["US"], "popularity": 30}]}
                """)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/2/combined_credits")).willReturn(okJson("""
                {"cast": [
                  {"id": 100, "media_type": "movie", "title": "Ensemble", "release_date": "2020-01-01", "popularity": 10},
                  {"id": 102, "media_type": "movie", "title": "Seul 2"},
                  {"id": 200, "media_type": "tv", "name": "Série commune", "first_air_date": "2019-01-01",
                   "genre_ids": [18], "origin_country": ["US"], "popularity": 30}]}
                """)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?cast=1,2")))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.results[*].id", contains("tv-200", "movie-100")));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?cast=1,2&type=movie")))
                .andExpect(jsonPath("$.results[*].id", contains("movie-100")));
    }

    @Test
    void listeAuCinemaDansLaRegion() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/movie/now_playing")).willReturn(okJson("""
                {"total_results": 1, "results": [{"id": 603, "title": "L'Odyssée"}]}
                """)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=now_playing&type=movie")))
                .andExpect(jsonPath("$.results[0].id").value("movie-603"));
        WIREMOCK.verify(getRequestedFor(urlPathEqualTo("/tmdb/movie/now_playing")).withQueryParam("region", equalTo("CA")));
    }

    @Test
    void tendancesFilmsSansTitresPasEncoreSortis() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/trending/movie/week")).willReturn(okJson("""
                {"results": [
                  {"id": 1, "title": "Sorti", "release_date": "2026-09-01"},
                  {"id": 2, "title": "Pas encore", "release_date": "2026-12-01"}]}
                """)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/discover?list=trending&type=movie")))
                .andExpect(jsonPath("$.results[*].id", contains("movie-1")));
    }

    @Test
    void tendancesDuJourSansPersonnes() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/trending/all/day")).willReturn(okJson(RESULTS)));
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/trending?type=all&window=day")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", contains("movie-603", "tv-85552", "anime-209867")));
    }

    @Test
    void fichePersonneAvecBiographieEnAnglaisParDefaut() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/505710"))
                .withQueryParam("append_to_response", equalTo("combined_credits"))
                .willReturn(okJson("""
                        {"id": 505710, "name": "Zendaya", "gender": 1, "birthday": "1996-09-01",
                         "place_of_birth": "Oakland, California, USA", "biography": "",
                         "combined_credits": {"cast": [
                           {"id": 85552, "media_type": "tv", "name": "Euphoria", "popularity": 90, "genre_ids": [18]},
                           {"id": 603, "media_type": "movie", "title": "L'Odyssée", "popularity": 400},
                           {"id": 603, "media_type": "movie", "title": "L'Odyssée", "popularity": 400}]}}
                        """)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/505710"))
                .withQueryParam("append_to_response", absent())
                .willReturn(okJson("{\"id\": 505710, \"biography\": \"Zendaya is an American actress.\"}")));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/people/505710")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gender").value(1))
                .andExpect(jsonPath("$.birthday").value("1996-09-01"))
                .andExpect(jsonPath("$.biography").value("Zendaya is an American actress."))
                // Sans doublon, par popularité.
                .andExpect(jsonPath("$.credits[*].id", contains("movie-603", "tv-85552")));
    }

    @Test
    void ficheRealisateurAvecSesFilmsSansLesPostesTechniques() throws Exception {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/person/137427"))
                .willReturn(okJson("""
                        {"id": 137427, "name": "Denis Villeneuve", "biography": "Réalisateur.",
                         "combined_credits": {"cast": [], "crew": [
                           {"id": 438631, "media_type": "movie", "title": "Dune", "job": "Director", "popularity": 300},
                           {"id": 438631, "media_type": "movie", "title": "Dune", "job": "Screenplay", "popularity": 300},
                           {"id": 27205, "media_type": "movie", "title": "Prisoners", "job": "Director", "popularity": 80},
                           {"id": 1, "media_type": "movie", "title": "Autre", "job": "Sound Mixer", "popularity": 900}]}}
                        """)));

        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/people/137427")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.credits[*].id", contains("movie-438631", "movie-27205")));
    }
}
