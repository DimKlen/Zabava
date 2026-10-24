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

/** Notifications sociales (specs/social/docs/05 §5, docs/06 §5) : regroupement, dédoublonnage, interrupteurs. */
class SocialNotificationsIT extends SocialTest {

    private static final String PUSH = "/expo/--/api/v2/push/send";
    private static final String TOKEN = "ExponentPushToken[dim]";

    @Autowired
    private ScheduledJobs jobs;

    private UUID dim;

    @BeforeEach
    void setUp() {
        WIREMOCK.stubFor(WireMock.post(urlPathEqualTo(PUSH)).willReturn(okJson("{\"data\": [{\"status\": \"ok\"}]}")));
        dim = member("dim.k", "Dim Kovac");
        db.sql("insert into push_tokens (user_id, expo_token, platform) values (:u, :t, 'android')")
                .param("u", dim)
                .param("t", TOKEN)
                .update();
    }

    private static String pushed(String body, String url) {
        return """
                [{"to": "%s", "body": "%s", "data": {"url": "%s"}}]
                """.formatted(TOKEN, body, url);
    }

    private void verifyPushed(String body, String url) {
        WIREMOCK.verify(postRequestedFor(urlPathEqualTo(PUSH))
                .withRequestBody(equalToJson(pushed(body, url), true, true)));
    }

    @Test
    void nouvelAbonne() throws Exception {
        UUID lea = member("lea.m", "Léa Martin");
        follow(lea, "dim.k");
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        verifyPushed("Léa (@lea.m) te suit", "zabava://u/lea.m");
        // Envoyée une seule fois.
        assertThat(jobs.dispatchNotifications()).isZero();
    }

    @Test
    void cinqAbonnesEnDixMinutesUneSeuleNotification() throws Exception {
        for (String name : new String[] {"max.dubois", "sarah.l", "theo.g", "hugo.p"}) {
            follow(member(name, name), "dim.k");
        }
        follow(member("lea.m", "Léa Martin"), "dim.k");
        // Léa est la plus récente (même instant : ordre d'arrivée).
        db.sql("update social_notifications set created_at = created_at - interval '10 minutes' where actor_id <> "
                + "(select id from profiles where username = 'lea.m')").update();

        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        verifyPushed("Léa et 4 autres te suivent", "zabava://u/dim.k/connections?tab=followers");
    }

    @Test
    void troisAbonnesRestentSepares() throws Exception {
        for (String name : new String[] {"max.dubois", "sarah.l", "theo.g"}) {
            follow(member(name, name), "dim.k");
        }
        assertThat(jobs.dispatchNotifications()).isEqualTo(3);
    }

    @Test
    void uneParPaireEt24h() throws Exception {
        UUID lea = member("lea.m", "Léa Martin");
        follow(lea, "dim.k");
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        // Se désabonner puis se réabonner : pas de nouvelle notification.
        mvc.perform(as(lea, delete("/api/v1/users/dim.k/follow"))).andExpect(status().isNoContent());
        db.sql("delete from follow_removals").update();
        follow(lea, "dim.k");
        assertThat(jobs.dispatchNotifications()).isZero();
    }

    @Test
    void desabonneAvantLEnvoiRienNePart() throws Exception {
        UUID lea = member("lea.m", "Léa Martin");
        follow(lea, "dim.k");
        mvc.perform(as(lea, delete("/api/v1/users/dim.k/follow"))).andExpect(status().isNoContent());
        assertThat(jobs.dispatchNotifications()).isZero();
        // Écartée pour de bon : elle ne part pas plus tard.
        assertThat(count("select count(*) from social_notifications where sent_at is null")).isZero();
    }

    @Test
    void couperNouvelAbonneArreteCesNotifications() throws Exception {
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"notificationPrefs\": {\"newFollower\": false}}"))
                .andExpect(status().isOk());
        follow(member("lea.m", "Léa Martin"), "dim.k");
        for (String name : new String[] {"max.dubois", "sarah.l", "theo.g", "hugo.p"}) {
            follow(member(name, name), "dim.k");
        }
        assertThat(jobs.dispatchNotifications()).isZero();
    }

    @Test
    void demandeEtDemandeAcceptee() throws Exception {
        makePrivate(dim);
        UUID lea = member("lea.m", "Léa Martin");
        db.sql("insert into push_tokens (user_id, expo_token, platform) values (:u, 'ExponentPushToken[lea]', 'android')")
                .param("u", lea)
                .update();
        follow(lea, "dim.k");
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        verifyPushed("Léa (@lea.m) veut te suivre", "zabava://follow-requests");

        mvc.perform(as(dim, post("/api/v1/me/follow-requests/lea.m/accept"))).andExpect(status().isNoContent());
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
        WIREMOCK.verify(postRequestedFor(urlPathEqualTo(PUSH)).withRequestBody(equalToJson("""
                [{"to": "ExponentPushToken[lea]", "body": "Dim a accepté ta demande", "data": {"url": "zabava://u/dim.k"}}]
                """, true, true)));
    }

    @Test
    void couperDemandesArreteDemandeEtAcceptation() throws Exception {
        makePrivate(dim);
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"notificationPrefs\": {\"followRequests\": false}}"))
                .andExpect(status().isOk());
        follow(member("lea.m", "Léa Martin"), "dim.k");
        assertThat(jobs.dispatchNotifications()).isZero();
    }

    @Test
    void passageEnPublicPrevientLesDemandeurs() throws Exception {
        makePrivate(dim);
        UUID lea = member("lea.m", "Léa Martin");
        db.sql("insert into push_tokens (user_id, expo_token, platform) values (:u, 'ExponentPushToken[lea]', 'android')")
                .param("u", lea)
                .update();
        follow(lea, "dim.k");
        jobs.dispatchNotifications();
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"isPrivate\": false}")).andExpect(status().isOk());
        assertThat(jobs.dispatchNotifications()).isEqualTo(1);
    }
}
