package com.zabava.api.me;

import static com.github.tomakehurst.wiremock.client.WireMock.deleteRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.github.tomakehurst.wiremock.client.WireMock;
import com.zabava.api.IntegrationTest;

/** GET/PUT /me/profile, PUT /me/providers, GET /providers, POST /me/push-token, DELETE /me. */
class ProfileIT extends IntegrationTest {

    @Test
    void profilParDefautCreeALInscription() throws Exception {
        UUID user = createUser("alice@example.com");
        mvc.perform(as(user, get("/api/v1/me/profile")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(user.toString()))
                .andExpect(jsonPath("$.email").value("alice@example.com"))
                .andExpect(jsonPath("$.displayName").value("alice"))
                .andExpect(jsonPath("$.authProvider").value("google"))
                .andExpect(jsonPath("$.region").value("CA"))
                .andExpect(jsonPath("$.language").value("fr-CA"))
                .andExpect(jsonPath("$.spoilerProtection").value(false))
                .andExpect(jsonPath("$.notificationPrefs.episodes").value(true))
                .andExpect(jsonPath("$.notificationPrefs.digestHour").value(9))
                .andExpect(jsonPath("$.timezone").value("America/Toronto"))
                .andExpect(jsonPath("$.onboardedAt").doesNotExist())
                .andExpect(jsonPath("$.providerIds", hasSize(0)));
    }

    @Test
    void miseAJourPartielleDuProfil() throws Exception {
        UUID user = createUser("alice@example.com");
        mvc.perform(as(user, put("/api/v1/me/profile"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"region": "FR", "spoilerProtection": true,
                                 "notificationPrefs": {"cinema": false, "digestHour": 20},
                                 "onboardedAt": "2026-10-11T12:00:00Z"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.region").value("FR"))
                .andExpect(jsonPath("$.language").value("fr-CA"))
                .andExpect(jsonPath("$.spoilerProtection").value(true))
                .andExpect(jsonPath("$.notificationPrefs.cinema").value(false))
                .andExpect(jsonPath("$.notificationPrefs.episodes").value(true))
                .andExpect(jsonPath("$.notificationPrefs.digestHour").value(20))
                .andExpect(jsonPath("$.onboardedAt").value("2026-10-11T12:00:00Z"));
    }

    @Test
    void regionInconnueRefusee() throws Exception {
        UUID user = createUser("alice@example.com");
        mvc.perform(as(user, put("/api/v1/me/profile"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"region\": \"DE\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("bad_request"));
    }

    @Test
    void mesPlateformesRemplaceesEtRelues() throws Exception {
        UUID user = createUser("alice@example.com");
        mvc.perform(as(user, put("/api/v1/me/providers"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"providerIds\": [8, 230, 8]}"))
                .andExpect(status().isNoContent());
        mvc.perform(as(user, put("/api/v1/me/providers"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"providerIds\": [230, 337]}"))
                .andExpect(status().isNoContent());
        mvc.perform(as(user, get("/api/v1/me/profile")))
                .andExpect(jsonPath("$.providerIds", contains(230, 337)));
    }

    @Test
    void plateformesDeTousLesPays() throws Exception {
        UUID user = createUser("alice@example.com");
        db.sql("""
                insert into providers (id, name, short) values (8, 'Netflix', 'N'), (230, 'Crave', 'C'), (381, 'Canal+', null);
                insert into provider_regions (provider_id, region, display_priority)
                values (8, 'CA', 1), (230, 'CA', 0), (8, 'FR', 1), (381, 'FR', 2);
                """).update();
        mvc.perform(as(user, get("/api/v1/providers")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name", contains("Crave", "Netflix", "Canal+")))
                .andExpect(jsonPath("$[0].shortName").value("C"));
    }

    @Test
    void jetonPushEtFuseauEnregistres() throws Exception {
        UUID user = createUser("alice@example.com");
        String body = """
                {"expoToken": "ExponentPushToken[abc]", "platform": "ios", "timezone": "Europe/Paris"}
                """;
        mvc.perform(as(user, post("/api/v1/me/push-token")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNoContent());
        // Idempotent : le même jeton n'est enregistré qu'une fois.
        mvc.perform(as(user, post("/api/v1/me/push-token")).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isNoContent());
        assertThat(db.sql("select count(*) from push_tokens where user_id = :id").param("id", user).query(Long.class).single())
                .isEqualTo(1);
        mvc.perform(as(user, get("/api/v1/me/profile"))).andExpect(jsonPath("$.timezone").value("Europe/Paris"));
    }

    @Test
    void fuseauInconnuRefuse() throws Exception {
        UUID user = createUser("alice@example.com");
        mvc.perform(as(user, post("/api/v1/me/push-token"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"expoToken\": \"t\", \"platform\": \"android\", \"timezone\": \"Mars/Olympus\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void suppressionDuCompte() throws Exception {
        UUID user = createUser("alice@example.com");
        WIREMOCK.stubFor(WireMock.delete(urlEqualTo("/supabase/auth/v1/admin/users/" + user))
                .willReturn(WireMock.aResponse().withStatus(200)));
        mvc.perform(as(user, put("/api/v1/me/providers"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"providerIds\": [8]}"))
                .andExpect(status().isNoContent());

        mvc.perform(as(user, delete("/api/v1/me"))).andExpect(status().isNoContent());

        WIREMOCK.verify(deleteRequestedFor(urlEqualTo("/supabase/auth/v1/admin/users/" + user))
                .withHeader("apikey", equalTo("service-role-test"))
                .withHeader("Authorization", equalTo("Bearer service-role-test")));
        assertThat(db.sql("select count(*) from profiles where id = :id").param("id", user).query(Long.class).single())
                .isZero();
        assertThat(db.sql("select count(*) from user_providers").query(Long.class).single()).isZero();
    }
}
