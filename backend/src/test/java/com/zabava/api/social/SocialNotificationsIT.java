package com.zabava.api.social;

import static com.github.tomakehurst.wiremock.client.WireMock.equalToJson;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.github.tomakehurst.wiremock.client.WireMock;
import com.zabava.api.jobs.ScheduledJobs;

/** Notifications sociales (amis réciproques) : demande d'ami, demande acceptée, interrupteur. */
class SocialNotificationsIT extends SocialTest {

    private static final String PUSH = "/expo/--/api/v2/push/send";
    private static final String TOKEN = "ExponentPushToken[dim]";
    private static final String LEA_TOKEN = "ExponentPushToken[lea]";

    @Autowired
    private ScheduledJobs jobs;

    private UUID dim;
    private UUID lea;

    @BeforeEach
    void setUp() {
        WIREMOCK.stubFor(WireMock.post(urlPathEqualTo(PUSH)).willReturn(okJson("{\"data\": [{\"status\": \"ok\"}]}")));
        dim = member("dim.k", "Dim Kovac");
        lea = member("lea.m", "Léa Martin");
        for (var token : new Object[][] {{dim, TOKEN}, {lea, LEA_TOKEN}}) {
            db.sql("insert into push_tokens (user_id, expo_token, platform) values (:u, :t, 'android')")
                    .param("u", token[0])
                    .param("t", token[1])
                    .update();
        }
    }

    private void verifyPushed(String token, String body, String url) {
        WIREMOCK.verify(postRequestedFor(urlPathEqualTo(PUSH)).withRequestBody(equalToJson("""
                [{"to": "%s", "body": "%s", "data": {"url": "%s"}}]
                """.formatted(token, body, url), true, true)));
    }

    @Test
    void demandeDAmiPuisDemandeAcceptee() throws Exception {
        follow(lea, "dim.k");
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        verifyPushed(TOKEN, "Léa (@lea.m) t'a envoyé une demande d'ami", "zabava://follow-requests");
        // Envoyée une seule fois.
        assertThat(jobs.dispatchNotifications()).isZero();

        mvc.perform(as(dim, post("/api/v1/me/follow-requests/lea.m/accept"))).andExpect(status().isNoContent());
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        verifyPushed(LEA_TOKEN, "Dim a accepté ta demande d'ami", "zabava://u/dim.k");
    }

    @Test
    void demandesCroiseesPrevientLePremierDemandeur() throws Exception {
        follow(lea, "dim.k");
        jobs.dispatchNotifications();
        follow(dim, "lea.m");
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        verifyPushed(LEA_TOKEN, "Dim a accepté ta demande d'ami", "zabava://u/dim.k");
    }

    @Test
    void demandeAnnuleeAvantLEnvoiRienNePart() throws Exception {
        follow(lea, "dim.k");
        mvc.perform(as(lea, delete("/api/v1/users/dim.k/follow"))).andExpect(status().isNoContent());
        assertThat(jobs.dispatchNotifications()).isZero();
        // Écartée pour de bon : elle ne part pas plus tard.
        assertThat(count("select count(*) from social_notifications where sent_at is null")).isZero();
    }

    @Test
    void retirerUnAmiNePrevientPersonne() throws Exception {
        befriend(lea, "lea.m", dim, "dim.k");
        jobs.dispatchNotifications();
        mvc.perform(as(dim, delete("/api/v1/users/lea.m/follow"))).andExpect(status().isNoContent());
        // « Annuler » rétablit l'amitié sans nouvelle notification.
        follow(dim, "lea.m");
        assertThat(jobs.dispatchNotifications()).isZero();
    }

    @Test
    void couperDemandesDAmisArreteDemandeEtAcceptation() throws Exception {
        for (UUID u : new UUID[] {dim, lea}) {
            mvc.perform(json(u, put("/api/v1/me/profile"), "{\"notificationPrefs\": {\"followRequests\": false}}"))
                    .andExpect(status().isOk());
        }
        befriend(lea, "lea.m", dim, "dim.k");
        assertThat(jobs.dispatchNotifications()).isZero();
    }
}
