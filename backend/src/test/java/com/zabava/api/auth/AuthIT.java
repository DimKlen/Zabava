package com.zabava.api.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import com.nimbusds.jwt.JWTClaimsSet;
import com.zabava.api.IntegrationTest;

/** Toute route de l'API exige un JWT Supabase d'utilisateur authentifié. */
class AuthIT extends IntegrationTest {

    @ParameterizedTest
    @ValueSource(strings = {
        "/api/v1/me/profile",
        "/api/v1/me/watchlist?type=movie",
        "/api/v1/me/upcoming?from=2026-10-11&to=2027-01-09",
        "/api/v1/search?q=zen",
        "/api/v1/discover?type=movie",
        "/api/v1/titles/movie/603",
        "/api/v1/providers",
        "/api/v1/trending"
    })
    void sansJwtRenvoie401(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isUnauthorized());
    }

    @Test
    void jwtMalSigneRenvoie401() throws Exception {
        UUID user = createUser("alice@example.com");
        String forged = token(user).substring(0, token(user).lastIndexOf('.') + 1) + "signature-invalide";
        mvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + forged))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void jwtExpireRenvoie401() throws Exception {
        UUID user = createUser("alice@example.com");
        String expired = sign(new JWTClaimsSet.Builder()
                .subject(user.toString())
                .claim("role", "authenticated")
                .audience("authenticated")
                .expirationTime(Date.from(Instant.now().minusSeconds(3600)))
                .build());
        mvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    /** La clé anon de Supabase est un JWT valide mais sans utilisateur : refusée. */
    @Test
    void jetonAnonRenvoie401() throws Exception {
        String anon = sign(new JWTClaimsSet.Builder()
                .claim("role", "anon")
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .build());
        mvc.perform(get("/api/v1/me/profile").header("Authorization", "Bearer " + anon))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void utilisateurInconnuDeSupabaseRenvoie401() throws Exception {
        mvc.perform(as(UUID.randomUUID(), get("/api/v1/me/profile")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("unknown_user"));
    }

    @Test
    void documentationOpenApiPublique() throws Exception {
        mvc.perform(get("/api/docs")).andExpect(status().isOk()).andExpect(jsonPath("$.info.title").value("Zabava API"));
    }
}
