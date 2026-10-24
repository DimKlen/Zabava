package com.zabava.api.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.jayway.jsonpath.JsonPath;

/** Activités écrites par les actions existantes, et fil d'activité (specs/social/docs/06 §2). */
class ActivityIT extends SocialTest {

    @Autowired
    private ActivityService activities;

    private UUID dim;
    private UUID lea;

    @BeforeEach
    void setUp() {
        stubCatalog();
        dim = member("dim.k", "Dim");
        lea = member("lea.m", "Léa Martin");
    }

    private List<String> types(UUID user) {
        return db.sql("select type from activities where user_id = :u order by type")
                .param("u", user)
                .query(String.class)
                .list();
    }

    /** Critère : cocher 5 épisodes de la même série le même jour crée une activité count = 5. */
    @Test
    void cinqEpisodesLeMemeJourDonnentUneSeuleActivite() throws Exception {
        addTitle(lea, 1399, "tv", "following");
        addAiredEpisodes(1399, 2, 5);
        for (int n = 1; n <= 5; n++) {
            markEpisodes(lea, "2026-10-10T1" + n + ":00:00Z", episodeId(1399, 2, n));
        }

        assertThat(count("select count(*) from activities where type = 'watched_episodes'")).isEqualTo(1);
        assertThat(count("select count from activities where type = 'watched_episodes'")).isEqualTo(5);
        assertThat(count("select count(*) from activities where type = 'watched_episodes' and episode_id is null"))
                .isEqualTo(1);
        assertThat(types(lea)).containsExactly("added", "started_show", "watched_episodes");

        // Décocher décrémente, puis supprime la ligne à 0.
        mvc.perform(json(lea, delete("/api/v1/me/episodes/watched"),
                        "{\"episodeIds\": [" + episodeId(1399, 2, 1) + ", " + episodeId(1399, 2, 2) + ", "
                                + episodeId(1399, 2, 3) + ", " + episodeId(1399, 2, 4) + "]}"))
                .andExpect(status().isNoContent());
        assertThat(count("select count from activities where type = 'watched_episodes'")).isEqualTo(1);
        assertThat(count("select episode_id from activities where type = 'watched_episodes'"))
                .isEqualTo(episodeId(1399, 2, 5));
        mvc.perform(json(lea, delete("/api/v1/me/episodes/watched"), "{\"episodeIds\": [" + episodeId(1399, 2, 5) + "]}"))
                .andExpect(status().isNoContent());
        assertThat(types(lea)).containsExactly("added");
    }

    @Test
    void lesEpisodesSontGroupesParJourDansLeFuseauDeLUtilisateur() throws Exception {
        addTitle(lea, 1399, "tv", "following");
        // 21 h et 23 h 30 à Toronto le 10 octobre : même jour local, deux jours UTC.
        markEpisodes(lea, "2026-10-11T01:00:00Z", episodeId(1399, 1, 1));
        markEpisodes(lea, "2026-10-11T03:30:00Z", episodeId(1399, 1, 2));
        assertThat(db.sql("select activity_date::text from activities where type = 'watched_episodes'")
                        .query(String.class).list())
                .containsExactly("2026-10-10");
    }

    @Test
    void serieTermineeQuandTousLesEpisodesDiffusesSontVus() throws Exception {
        addTitle(lea, 1399, "tv", "following");
        db.sql("update titles set ended = true where tmdb_id = 1399").update();
        markEpisodes(lea, null, episodeId(1399, 1, 1));
        assertThat(types(lea)).doesNotContain("finished_show");
        // L'épisode 3 n'est pas encore diffusé (14 octobre) : il ne compte pas.
        markEpisodes(lea, null, episodeId(1399, 1, 2));
        assertThat(types(lea)).contains("finished_show");

        mvc.perform(json(lea, delete("/api/v1/me/episodes/watched"), "{\"episodeIds\": [" + episodeId(1399, 1, 2) + "]}"));
        assertThat(types(lea)).doesNotContain("finished_show");
    }

    @Test
    void filmAVoirPuisVuPuisNonVu() throws Exception {
        addTitle(lea, 603, "movie", "towatch");
        assertThat(types(lea)).containsExactly("added");
        // Vu le jour même de l'ajout : l'ajout disparaît au profit de « a vu ».
        mvc.perform(json(lea, patch("/api/v1/me/titles/movie-603"), "{\"status\": \"watched\"}"));
        assertThat(types(lea)).containsExactly("watched_movie");
        // Non vu : retour à l'état d'avant, à l'identique.
        mvc.perform(json(lea, patch("/api/v1/me/titles/movie-603"), "{\"status\": \"towatch\"}"));
        assertThat(types(lea)).containsExactly("added");
        mvc.perform(as(lea, delete("/api/v1/me/titles/movie-603"))).andExpect(status().isNoContent());
        assertThat(types(lea)).isEmpty();
    }

    @Test
    void filmAjouteUnAutreJourGardeSonAjout() throws Exception {
        mvc.perform(json(lea, post("/api/v1/me/titles"), """
                {"tmdbId": 603, "type": "movie", "status": "watched",
                 "addedAt": "2026-10-01T12:00:00Z", "watchedAt": "2026-10-09T21:00:00Z"}
                """)).andExpect(status().isCreated());
        assertThat(types(lea)).containsExactly("added", "watched_movie");
    }

    @Test
    void annulerUnRetraitRestaureLesMemesActivites() throws Exception {
        addTitle(lea, 1399, "tv", "following");
        markEpisodes(lea, "2026-10-09T20:00:00Z", episodeId(1399, 1, 1));
        List<String> before = db.sql("select type || ' ' || count || ' ' || updated_at from activities order by type")
                .query(String.class).list();

        mvc.perform(as(lea, delete("/api/v1/me/titles/tv-1399"))).andExpect(status().isNoContent());
        assertThat(types(lea)).isEmpty();
        mvc.perform(json(lea, post("/api/v1/me/titles"),
                "{\"tmdbId\": 1399, \"type\": \"tv\", \"status\": \"following\", \"addedAt\": \"2026-10-11T12:00:00Z\"}"));
        markEpisodes(lea, "2026-10-09T20:00:00Z", episodeId(1399, 1, 1));

        assertThat(db.sql("select type || ' ' || count || ' ' || updated_at from activities order by type")
                .query(String.class).list()).isEqualTo(before);
    }

    @Test
    void leFilMontreSeulementMesAmis() throws Exception {
        UUID max = member("max.dubois", "Max Dubois");
        addTitle(lea, 603, "movie", "towatch");
        addTitle(max, 603, "movie", "watched");
        addTitle(dim, 603, "movie", "towatch");
        befriend(dim, "dim.k", lea, "lea.m");

        mvc.perform(as(dim, get("/api/v1/me/feed")))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].type").value("added"))
                .andExpect(jsonPath("$.items[0].actor.username").value("lea.m"))
                .andExpect(jsonPath("$.items[0].title.id").value("movie-603"))
                .andExpect(jsonPath("$.items[0].inMyList").value(true));

        // Une demande envoyée à Max ne suffit pas ; une fois amis, son activité apparaît. Devenir
        // amis n'est pas une activité.
        follow(dim, "max.dubois");
        mvc.perform(as(dim, get("/api/v1/me/feed"))).andExpect(jsonPath("$.items", hasSize(1)));
        befriend(max, "max.dubois", lea, "lea.m");
        mvc.perform(as(max, post("/api/v1/me/follow-requests/dim.k/accept")));
        mvc.perform(as(dim, get("/api/v1/me/feed")))
                .andExpect(jsonPath("$.items[*].type", contains("watched_movie", "added")));

        // Bloquer Léa la retire du fil.
        mvc.perform(as(dim, post("/api/v1/users/lea.m/block")));
        mvc.perform(as(dim, get("/api/v1/me/feed")))
                .andExpect(jsonPath("$.items[*].type", contains("watched_movie")));
    }

    @Test
    void leFilEstPagineParCurseur() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        addTitle(lea, 1399, "tv", "following");
        addAiredEpisodes(1399, 2, 3);
        for (int n = 1; n <= 3; n++) {
            markEpisodes(lea, "2026-10-0" + n + "T20:00:00Z", episodeId(1399, 2, n));
        }
        String cursor = JsonPath.read(mvc.perform(as(dim, get("/api/v1/me/feed?limit=2")))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andReturn().getResponse().getContentAsString(), "$.nextCursor");
        mvc.perform(as(dim, get("/api/v1/me/feed?limit=2&cursor=" + cursor)))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[*].type", contains("watched_episodes", "watched_episodes")))
                .andExpect(jsonPath("$.nextCursor").exists());
        mvc.perform(as(dim, get("/api/v1/me/feed?limit=50")))
                .andExpect(jsonPath("$.items[*].type",
                        contains("added", "watched_episodes", "watched_episodes", "watched_episodes", "started_show")))
                .andExpect(jsonPath("$.items[1].episode.name").value("Épisode 3"))
                .andExpect(jsonPath("$.items[1].count").value(1))
                .andExpect(jsonPath("$.nextCursor").doesNotExist());
    }

    @Test
    void lesActivitesNeSontLuesQueParLesAmis() throws Exception {
        addTitle(lea, 603, "movie", "towatch");
        follow(dim, "lea.m");
        mvc.perform(as(dim, get("/api/v1/me/feed"))).andExpect(jsonPath("$.items", hasSize(0)));
        mvc.perform(as(lea, post("/api/v1/me/follow-requests/dim.k/accept")));
        mvc.perform(as(dim, get("/api/v1/me/feed"))).andExpect(jsonPath("$.items", hasSize(1)));
    }

    @Test
    void laPurgeRetireLesActivitesDePlusDe180Jours() throws Exception {
        addTitle(lea, 603, "movie", "towatch");
        db.sql("update activities set updated_at = '2026-04-01T00:00:00Z'").update();
        assertThat(count("select count(*) from activities")).isEqualTo(1);
        assertThat(activities.purge()).isEqualTo(1);
    }
}
