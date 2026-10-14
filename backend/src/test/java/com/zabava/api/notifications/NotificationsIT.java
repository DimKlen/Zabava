package com.zabava.api.notifications;

import static com.github.tomakehurst.wiremock.client.WireMock.equalToJson;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.zabava.api.IntegrationTest;
import com.zabava.api.jobs.ScheduledJobs;

/**
 * Envoi des notifications (specs/docs/01 §7). Maintenant = 11 octobre 2026, 12 h UTC,
 * soit 8 h à Toronto (fuseau du profil).
 */
class NotificationsIT extends IntegrationTest {

    private static final String TOKEN = "ExponentPushToken[alice]";
    private static final String OK = "{\"data\": [{\"status\": \"ok\", \"id\": \"t1\"}]}";

    @Autowired
    private ScheduledJobs jobs;

    private UUID user;

    @BeforeEach
    void setUp() throws Exception {
        stubCatalog();
        WIREMOCK.stubFor(post(urlPathEqualTo("/expo/--/api/v2/push/send")).willReturn(okJson(OK)));
        user = createUser("alice@example.com");
        mvc.perform(as(user, MockMvcRequestBuilders.post("/api/v1/me/push-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expoToken\": \"" + TOKEN + "\", \"platform\": \"android\", \"timezone\": \"America/Toronto\"}"))
                .andExpect(status().isNoContent());
    }

    private void add(String body) throws Exception {
        mvc.perform(as(user, MockMvcRequestBuilders.post("/api/v1/me/titles"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    private void digestAt(int hour) throws Exception {
        mvc.perform(as(user, put("/api/v1/me/profile"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notificationPrefs\": {\"digestHour\": " + hour + "}}"))
                .andExpect(status().isOk());
    }

    private void airsAt(int season, int number, String airstamp) {
        db.sql("""
                update episodes set airstamp = cast(:at as timestamptz)
                where season_number = :s and episode_number = :e
                """).param("at", airstamp).param("s", season).param("e", number).update();
    }

    private static String pushed(String body, String url) {
        return """
                [{"to": "%s", "body": "%s", "sound": "default", "channelId": "default", "data": {"url": "%s"}}]
                """.formatted(TOKEN, body, url);
    }

    @Test
    void nouvelEpisodeUneSeuleFois() throws Exception {
        add("{\"tmdbId\": 1399, \"type\": \"tv\", \"status\": \"following\"}");
        airsAt(1, 2, "2026-10-11T11:00:00Z");

        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        WIREMOCK.verify(postRequestedFor(urlPathEqualTo("/expo/--/api/v2/push/send"))
                .withRequestBody(equalToJson(pushed("The Bear · S01 E02 est disponible",
                        "zabava://title/tv/1399?tab=episodes&season=1&episode=2"))));

        // Jamais deux fois : le journal bloque le renvoi.
        assertThat(jobs.dispatchNotifications()).isZero();
        WIREMOCK.verify(1, postRequestedFor(urlPathEqualTo("/expo/--/api/v2/push/send")));
        assertThat(db.sql("select count(*) from notifications_log where user_id = :u and type = 'episode'")
                .param("u", user).query(Long.class).single()).isEqualTo(1);
    }

    @Test
    void clocheCoupeeOuTypeCoupe() throws Exception {
        add("{\"tmdbId\": 1399, \"type\": \"tv\", \"status\": \"following\"}");
        airsAt(1, 2, "2026-10-11T11:00:00Z");
        mvc.perform(as(user, patch("/api/v1/me/titles/tv-1399"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notificationsEnabled\": false}"))
                .andExpect(status().isOk());
        assertThat(jobs.dispatchNotifications()).isZero();

        mvc.perform(as(user, patch("/api/v1/me/titles/tv-1399"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notificationsEnabled\": true}"))
                .andExpect(status().isOk());
        mvc.perform(as(user, put("/api/v1/me/profile"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notificationPrefs\": {\"episodes\": false}}"))
                .andExpect(status().isOk());
        assertThat(jobs.dispatchNotifications()).isZero();
        WIREMOCK.verify(0, postRequestedFor(urlPathEqualTo("/expo/--/api/v2/push/send")));
    }

    @Test
    void sortieEnSalleALHeureDuRecapitulatif() throws Exception {
        add("{\"tmdbId\": 603, \"type\": \"movie\", \"status\": \"towatch\"}");
        db.sql("update release_dates set date = date '2026-10-11' where region = 'CA' and type = 'salle'").update();

        // 8 h à Toronto : récapitulatif à 9 h, pas encore.
        assertThat(jobs.dispatchNotifications()).isZero();
        digestAt(8);
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        WIREMOCK.verify(postRequestedFor(urlPathEqualTo("/expo/--/api/v2/push/send"))
                .withRequestBody(equalToJson(pushed("L'Odyssée sort au cinéma aujourd'hui", "zabava://title/movie/603"))));
    }

    @Test
    void nouvelleSaisonPourUneSerieAJour() throws Exception {
        add("{\"tmdbId\": 1399, \"type\": \"tv\", \"status\": \"following\"}");
        long titleId = db.sql("select id from titles where tmdb_id = 1399").query(Long.class).single();
        // Épisodes diffusés vus ; saison 2 annoncée pour le 9 janvier.
        db.sql("""
                insert into user_episodes (user_id, episode_id)
                select :u, id from episodes where title_id = :t and season_number = 1 and episode_number <= 2
                """).param("u", user).param("t", titleId).update();
        db.sql("""
                insert into episodes (title_id, season_number, episode_number, air_date)
                values (:t, 2, 1, date '2027-01-09')
                """).param("t", titleId).update();
        digestAt(8);

        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        WIREMOCK.verify(postRequestedFor(urlPathEqualTo("/expo/--/api/v2/push/send"))
                .withRequestBody(equalToJson(pushed("La saison 2 de The Bear commence le 9 janv.",
                        "zabava://title/tv/1399?tab=episodes&season=2"))));
    }

    @Test
    void jetonInconnuSupprime() throws Exception {
        WIREMOCK.stubFor(post(urlPathEqualTo("/expo/--/api/v2/push/send")).willReturn(okJson("""
                {"data": [{"status": "error", "details": {"error": "DeviceNotRegistered"}}]}
                """)));
        add("{\"tmdbId\": 1399, \"type\": \"tv\", \"status\": \"following\"}");
        airsAt(1, 2, "2026-10-11T11:00:00Z");

        jobs.dispatchNotifications();
        assertThat(db.sql("select count(*) from push_tokens").query(Long.class).single()).isZero();
    }

    @Test
    void deconnexionRetireLeJeton() throws Exception {
        mvc.perform(as(user, delete("/api/v1/me/push-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expoToken\": \"" + TOKEN + "\"}"))
                .andExpect(status().isNoContent());
        assertThat(db.sql("select count(*) from push_tokens").query(Long.class).single()).isZero();
    }

    @Test
    void synchronisationDeNuitRechargeLesFilms() throws Exception {
        add("{\"tmdbId\": 603, \"type\": \"movie\", \"status\": \"towatch\"}");
        WIREMOCK.resetRequests();
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
        db.sql("update titles set updated_at = timestamptz '2026-10-09T12:00:00Z'").update();

        assertThat(jobs.syncAvailability()).isEqualTo(1);
        WIREMOCK.verify(getRequestedFor(urlPathEqualTo("/tmdb/movie/603")));
    }
}
