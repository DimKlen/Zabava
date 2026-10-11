package com.zabava.api.auth;

import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.zabava.api.IntegrationTest;

/** Chemin de production : JWT ES256 vérifiés par le JWKS du projet Supabase. */
class JwksIT extends IntegrationTest {

    private static final ECKey KEY = generate();
    private static final ECKey OTHER_KEY = generate();

    @DynamicPropertySource
    static void jwks(DynamicPropertyRegistry registry) {
        registry.add("zabava.supabase.jwks-uri", () -> WIREMOCK.baseUrl() + "/supabase/auth/v1/.well-known/jwks.json");
    }

    @BeforeEach
    void publishJwks() {
        WIREMOCK.stubFor(get(urlPathEqualTo("/supabase/auth/v1/.well-known/jwks.json"))
                .willReturn(okJson(new JWKSet(KEY.toPublicJWK()).toString())));
    }

    @Test
    void jetonEs256DuProjetAccepte() throws Exception {
        UUID user = createUser("alice@example.com");
        mvc.perform(MockMvcRequestBuilders.get("/api/v1/me/profile")
                        .header("Authorization", "Bearer " + es256(KEY, user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("alice@example.com"));
    }

    @Test
    void jetonSigneParUneAutreCleRefuse() throws Exception {
        UUID user = createUser("alice@example.com");
        mvc.perform(MockMvcRequestBuilders.get("/api/v1/me/profile")
                        .header("Authorization", "Bearer " + es256(OTHER_KEY, user)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void jetonHs256RefuseQuandLeJwksEstConfigure() throws Exception {
        UUID user = createUser("alice@example.com");
        mvc.perform(as(user, MockMvcRequestBuilders.get("/api/v1/me/profile"))).andExpect(status().isUnauthorized());
    }

    private static String es256(ECKey key, UUID user) throws JOSEException {
        var jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.ES256).keyID(key.getKeyID()).build(),
                new JWTClaimsSet.Builder()
                        .subject(user.toString())
                        .audience("authenticated")
                        .claim("role", "authenticated")
                        .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                        .build());
        jwt.sign(new ECDSASigner(key));
        return jwt.serialize();
    }

    private static ECKey generate() {
        try {
            return new ECKeyGenerator(Curve.P_256).keyID(UUID.randomUUID().toString()).generate();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }
}
