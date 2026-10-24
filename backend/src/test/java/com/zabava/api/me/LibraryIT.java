package com.zabava.api.me;

import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.github.tomakehurst.wiremock.client.WireMock;
import com.zabava.api.IntegrationTest;

/** GET /me/watchlist, POST/PATCH/DELETE /me/titles, POST/DELETE /me/episodes/watched. */
class LibraryIT extends IntegrationTest {

    private UUID user;

    @BeforeEach
    void setUp() {
        stubCatalog();
        user = createUser("alice@example.com");
    }

    private void add(int tmdbId, String type, String status) throws Exception {
        mvc.perform(json(post("/api/v1/me/titles"),
                        "{\"tmdbId\": " + tmdbId + ", \"type\": \"" + type + "\", \"status\": \"" + status + "\"}"))
                .andExpect(status().isCreated());
    }

    private MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder request, String body) {
        return as(user, request).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private long episodeId(int tmdbId, int season, int number) {
        return db.sql("""
                select e.id from episodes e join titles t on t.id = e.title_id
                where t.tmdb_id = :tmdb and e.season_number = :s and e.episode_number = :e
                """)
                .param("tmdb", tmdbId)
                .param("s", season)
                .param("e", number)
                .query(Long.class)
                .single();
    }

    @Test
    void sortieNumeriqueAilleursQuandMaRegionNEnAPas() throws Exception {
        // « L'Odyssée » : en salle au Canada, date numérique seulement aux États-Unis, aucune offre.
        WIREMOCK.stubFor(WireMock.get(urlPathEqualTo("/tmdb/movie/1368337")).willReturn(okJson("""
                        {"id": 1368337, "title": "L'Odyssée", "original_title": "The Odyssey",
                         "release_date": "2026-07-15",
                         "release_dates": {"results": [
                           {"iso_3166_1": "CA", "release_dates": [{"type": 3, "release_date": "2026-07-17T00:00:00.000Z"}]},
                           {"iso_3166_1": "US", "release_dates": [
                             {"type": 3, "release_date": "2026-07-17T00:00:00.000Z"},
                             {"type": 4, "release_date": "2026-11-17T00:00:00.000Z"}]}]},
                         "watch/providers": {"results": {}}}
                        """)));

        mvc.perform(as(user, get("/api/v1/titles/movie/1368337")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.releaseTheatrical").value("2026-07-17"))
                .andExpect(jsonPath("$.releaseDigital").value("2026-11-17"))
                .andExpect(jsonPath("$.releaseDigitalCountry").value("US"));
        mvc.perform(as(user, get("/api/v1/titles/badges?ids=movie-1368337")))
                .andExpect(jsonPath("$[0].releaseDigital").value("2026-11-17"));

        mvc.perform(json(post("/api/v1/me/titles"), "{\"tmdbId\": 1368337, \"type\": \"movie\", \"status\": \"towatch\"}"))
                .andExpect(status().isCreated());
        mvc.perform(as(user, get("/api/v1/me/watchlist?type=movie")))
                .andExpect(jsonPath("$[0].releaseTheatrical").value("2026-07-17"))
                .andExpect(jsonPath("$[0].releaseDigital").value("2026-11-17"));
    }

    @Test
    void ajoutFilmEtMaListe() throws Exception {
        mvc.perform(json(post("/api/v1/me/titles"), "{\"tmdbId\": 603, \"type\": \"movie\", \"status\": \"towatch\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.titleId").value("movie-603"))
                .andExpect(jsonPath("$.status").value("towatch"))
                .andExpect(jsonPath("$.addedAt").exists());

        mvc.perform(as(user, get("/api/v1/me/watchlist?type=movie")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("movie-603"))
                .andExpect(jsonPath("$[0].title").value("L'Odyssée"))
                .andExpect(jsonPath("$[0].year").value(2026))
                .andExpect(jsonPath("$[0].imdbRating").value(8.5))
                .andExpect(jsonPath("$[0].releaseTheatrical").value("2026-10-20"))
                .andExpect(jsonPath("$[0].availability.sub[0].name").value("Netflix"))
                .andExpect(jsonPath("$[0].availability.sub[0].shortName").value("N"))
                .andExpect(jsonPath("$[0].userTitle.status").value("towatch"))
                .andExpect(jsonPath("$[0].episodes").doesNotExist());
    }

    @Test
    void marquerVuPuisNonVu() throws Exception {
        add(603, "movie", "towatch");
        mvc.perform(json(patch("/api/v1/me/titles/movie-603"), "{\"status\": \"watched\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("watched"))
                .andExpect(jsonPath("$.watchedAt").value("2026-10-11T12:00:00Z"));
        // « Marquer comme non vu » remet le film dans À voir, sans date.
        mvc.perform(json(patch("/api/v1/me/titles/movie-603"), "{\"status\": \"towatch\"}"))
                .andExpect(jsonPath("$.status").value("towatch"))
                .andExpect(jsonPath("$.watchedAt").doesNotExist());
    }

    @Test
    void marquerVuUnFilmHorsListeLAjouteEnVu() throws Exception {
        mvc.perform(json(post("/api/v1/me/titles"), "{\"tmdbId\": 603, \"type\": \"movie\", \"status\": \"watched\"}"))
                .andExpect(jsonPath("$.status").value("watched"))
                .andExpect(jsonPath("$.watchedAt").value("2026-10-11T12:00:00Z"));
    }

    @Test
    void annulerUnRetraitRemetLeTitreCommeAvant() throws Exception {
        // « Annuler » renvoie la date d'ajout, la date de visionnage et les alertes d'origine.
        mvc.perform(json(post("/api/v1/me/titles"), """
                        {"tmdbId": 603, "type": "movie", "status": "watched",
                         "addedAt": "2026-09-01T08:00:00Z", "watchedAt": "2026-09-20T21:00:00Z",
                         "notificationsEnabled": false}
                        """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.addedAt").value("2026-09-01T08:00:00Z"))
                .andExpect(jsonPath("$.watchedAt").value("2026-09-20T21:00:00Z"))
                .andExpect(jsonPath("$.notificationsEnabled").value(false));
    }

    @Test
    void uneDateDAjoutFutureEstRameneeAMaintenant() throws Exception {
        mvc.perform(json(post("/api/v1/me/titles"), """
                        {"tmdbId": 603, "type": "movie", "status": "towatch", "addedAt": "2030-01-01T00:00:00Z"}
                        """))
                .andExpect(jsonPath("$.addedAt").value("2026-10-11T12:00:00Z"))
                .andExpect(jsonPath("$.notificationsEnabled").value(true));
    }

    @Test
    void couperLesAlertesDuTitre() throws Exception {
        add(603, "movie", "towatch");
        mvc.perform(json(patch("/api/v1/me/titles/movie-603"), "{\"notificationsEnabled\": false}"))
                .andExpect(jsonPath("$.notificationsEnabled").value(false))
                .andExpect(jsonPath("$.status").value("towatch"));
    }

    @Test
    void statutIncompatibleAvecLeTypeRefuse() throws Exception {
        mvc.perform(json(post("/api/v1/me/titles"), "{\"tmdbId\": 603, \"type\": \"movie\", \"status\": \"following\"}"))
                .andExpect(status().isBadRequest());
        add(1399, "tv", "following");
        mvc.perform(json(patch("/api/v1/me/titles/tv-1399"), "{\"status\": \"watched\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void retirerUnTitreEfface() throws Exception {
        add(1399, "tv", "following");
        long e1 = episodeId(1399, 1, 1);
        mvc.perform(json(post("/api/v1/me/episodes/watched"), "{\"episodeIds\": [" + e1 + "]}"))
                .andExpect(status().isNoContent());

        mvc.perform(as(user, delete("/api/v1/me/titles/tv-1399"))).andExpect(status().isNoContent());

        mvc.perform(as(user, get("/api/v1/me/watchlist?type=tv"))).andExpect(jsonPath("$", hasSize(0)));
        assertThat(db.sql("select count(*) from user_episodes").query(Long.class).single()).isZero();
    }

    @Test
    void retirerUnTitreAbsentRenvoie404() throws Exception {
        mvc.perform(json(patch("/api/v1/me/titles/movie-603"), "{\"status\": \"watched\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void serieSuivieAvecSesEpisodes() throws Exception {
        add(1399, "tv", "following");
        mvc.perform(as(user, get("/api/v1/me/watchlist?type=tv")))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value("tv-1399"))
                .andExpect(jsonPath("$[0].status").value("En cours"))
                .andExpect(jsonPath("$[0].ended").value(false))
                .andExpect(jsonPath("$[0].network").value("FX"))
                // Saison 0 comprise : c'est le client qui l'exclut des calculs.
                .andExpect(jsonPath("$[0].episodes[*].season", contains(0, 1, 1, 1)))
                .andExpect(jsonPath("$[0].episodes[3].airstamp").value("2026-10-14T01:00:00Z"));
    }

    @Test
    void cocherEtDecocherDesEpisodesEnLot() throws Exception {
        add(1399, "tv", "following");
        long e1 = episodeId(1399, 1, 1);
        long e2 = episodeId(1399, 1, 2);
        mvc.perform(json(post("/api/v1/me/episodes/watched"),
                        "{\"episodeIds\": [" + e1 + ", " + e2 + "], \"watchedAt\": \"2026-10-10T20:00:00Z\"}"))
                .andExpect(status().isNoContent());
        // Idempotent : cocher à nouveau ne change pas la date.
        mvc.perform(json(post("/api/v1/me/episodes/watched"), "{\"episodeIds\": [" + e1 + "]}"))
                .andExpect(status().isNoContent());

        mvc.perform(as(user, get("/api/v1/me/watchlist?type=tv")))
                .andExpect(jsonPath("$[0].episodes[1].watchedAt").value("2026-10-10T20:00:00Z"))
                .andExpect(jsonPath("$[0].episodes[2].watchedAt").value("2026-10-10T20:00:00Z"))
                .andExpect(jsonPath("$[0].episodes[3].watchedAt").doesNotExist());

        mvc.perform(json(delete("/api/v1/me/episodes/watched"), "{\"episodeIds\": [" + e2 + "]}"))
                .andExpect(status().isNoContent());
        mvc.perform(as(user, get("/api/v1/me/watchlist?type=tv")))
                .andExpect(jsonPath("$[0].episodes[2].watchedAt").doesNotExist());
    }

    @Test
    void cocherUnEpisodeDUneSerieHorsListeLaSuit() throws Exception {
        add(1399, "tv", "following");
        long e1 = episodeId(1399, 1, 1);
        mvc.perform(as(user, delete("/api/v1/me/titles/tv-1399"))).andExpect(status().isNoContent());

        mvc.perform(json(post("/api/v1/me/episodes/watched"), "{\"episodeIds\": [" + e1 + "]}"))
                .andExpect(status().isNoContent());
        mvc.perform(as(user, get("/api/v1/me/watchlist?type=tv")))
                .andExpect(jsonPath("$[0].userTitle.status").value("following"));
    }

    @Test
    void episodeInconnuRenvoie404() throws Exception {
        mvc.perform(json(post("/api/v1/me/episodes/watched"), "{\"episodeIds\": [999999]}"))
                .andExpect(status().isNotFound());
    }

    /** Critère de l'étape 3 : type=anime ne renvoie que des animés, type=tv aucun. */
    @Test
    void animesSeparesDesSeries() throws Exception {
        add(1399, "tv", "following");
        add(209867, "anime", "following");
        add(603, "movie", "towatch");

        mvc.perform(as(user, get("/api/v1/me/watchlist?type=anime")))
                .andExpect(jsonPath("$[*].id", contains("anime-209867")))
                .andExpect(jsonPath("$[0].type").value("anime"));
        mvc.perform(as(user, get("/api/v1/me/watchlist?type=tv")))
                .andExpect(jsonPath("$[*].id", contains("tv-1399")));
        mvc.perform(as(user, get("/api/v1/me/watchlist?type=movie")))
                .andExpect(jsonPath("$[*].id", contains("movie-603")));
    }

    @Test
    void typeDeListeObligatoire() throws Exception {
        mvc.perform(as(user, get("/api/v1/me/watchlist"))).andExpect(status().isBadRequest());
        mvc.perform(as(user, get("/api/v1/me/watchlist?type=book"))).andExpect(status().isBadRequest());
    }
}
