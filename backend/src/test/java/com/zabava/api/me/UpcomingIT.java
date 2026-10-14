package com.zabava.api.me;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.zabava.api.IntegrationTest;

/** GET /me/upcoming : épisodes, sorties en salle et numériques, « Sans date ». */
class UpcomingIT extends IntegrationTest {

    private static final String RANGE = "/api/v1/me/upcoming?from=2026-10-11&to=2027-01-08";

    private UUID user;

    @BeforeEach
    void setUp() throws Exception {
        stubCatalog();
        user = createUser("alice@example.com");
        for (String body : new String[] {
            "{\"tmdbId\": 603, \"type\": \"movie\", \"status\": \"towatch\"}",
            "{\"tmdbId\": 1399, \"type\": \"tv\", \"status\": \"following\"}",
            "{\"tmdbId\": 209867, \"type\": \"anime\", \"status\": \"following\"}"
        }) {
            mvc.perform(as(user, post("/api/v1/me/titles")).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isCreated());
        }
    }

    @Test
    void evenementsDansLeFuseauDeLUtilisateur() throws Exception {
        mvc.perform(as(user, get(RANGE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.events", hasSize(3)))
                // Diffusé le 14 à 01:00 UTC = le 13 à 21 h à Toronto (fuseau du profil).
                .andExpect(jsonPath("$.events[0].date").value("2026-10-13"))
                .andExpect(jsonPath("$.events[0].kind").value("episode"))
                .andExpect(jsonPath("$.events[0].title.id").value("tv-1399"))
                .andExpect(jsonPath("$.events[0].season").value(1))
                .andExpect(jsonPath("$.events[0].episode").value(3))
                .andExpect(jsonPath("$.events[0].airstamp").value("2026-10-14T01:00:00Z"))
                // Plateforme d'abonnement de la région avant la chaîne d'origine (FX).
                .andExpect(jsonPath("$.events[0].provider").value("Disney Plus"))
                .andExpect(jsonPath("$.events[1].date").value("2026-10-20"))
                .andExpect(jsonPath("$.events[1].kind").value("theatrical"))
                .andExpect(jsonPath("$.events[2].date").value("2026-12-18"))
                .andExpect(jsonPath("$.events[2].kind").value("digital"))
                // Frieren : en production, aucun épisode daté à venir.
                .andExpect(jsonPath("$.noDate", hasSize(1)))
                .andExpect(jsonPath("$.noDate[0].title.id").value("anime-209867"))
                .andExpect(jsonPath("$.noDate[0].nextSeason").value(2));
    }

    @Test
    void sansAbonnementLaChaine() throws Exception {
        db.sql("delete from title_availability where title_id = (select id from titles where tmdb_id = 1399)").update();
        mvc.perform(as(user, get(RANGE + "&type=tv")))
                .andExpect(jsonPath("$.events[0].provider").value("FX"));
    }

    @Test
    void filtreParType() throws Exception {
        mvc.perform(as(user, get(RANGE + "&type=movie")))
                .andExpect(jsonPath("$.events", hasSize(2)))
                .andExpect(jsonPath("$.noDate", hasSize(0)));
        mvc.perform(as(user, get(RANGE + "&type=anime")))
                .andExpect(jsonPath("$.events", hasSize(0)))
                .andExpect(jsonPath("$.noDate", hasSize(1)));
    }

    @Test
    void filmVuEtSerieAbandonneeExclus() throws Exception {
        mvc.perform(as(user, patch("/api/v1/me/titles/movie-603"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"watched\"}"))
                .andExpect(status().isOk());
        mvc.perform(as(user, patch("/api/v1/me/titles/tv-1399"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"abandoned\"}"))
                .andExpect(status().isOk());
        mvc.perform(as(user, get(RANGE + "&type=all")))
                .andExpect(jsonPath("$.events", hasSize(0)));
    }

    @Test
    void episodeDejaVuExclu() throws Exception {
        long e3 = db.sql("""
                select e.id from episodes e join titles t on t.id = e.title_id
                where t.tmdb_id = 1399 and e.season_number = 1 and e.episode_number = 3
                """).query(Long.class).single();
        mvc.perform(as(user, post("/api/v1/me/episodes/watched"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"episodeIds\": [" + e3 + "]}"))
                .andExpect(status().isNoContent());
        mvc.perform(as(user, get(RANGE + "&type=tv"))).andExpect(jsonPath("$.events", hasSize(0)));
    }

    /** Offres présentes à l'ajout : pas d'arrivée. Offre apparue ensuite : « Arrive sur … ». */
    @Test
    void arriveeEnStreamingDetecteeApresLAjout() throws Exception {
        db.sql("""
                update title_availability set first_seen_at = '2026-10-11T09:00:00Z'
                where provider_id = 8 and region = 'CA'
                """).update();
        mvc.perform(as(user, get(RANGE + "&type=movie")))
                .andExpect(jsonPath("$.events", hasSize(3)))
                .andExpect(jsonPath("$.events[0].date").value("2026-10-11"))
                .andExpect(jsonPath("$.events[0].kind").value("streaming"))
                .andExpect(jsonPath("$.events[0].provider").value("Netflix"));
    }

    @Test
    void periodeInvalideRefusee() throws Exception {
        mvc.perform(as(user, get("/api/v1/me/upcoming?from=2026-10-11&to=2026-10-01")))
                .andExpect(status().isBadRequest());
        mvc.perform(as(user, get("/api/v1/me/upcoming?from=2026-10-11&to=2028-01-01")))
                .andExpect(status().isBadRequest());
    }
}
