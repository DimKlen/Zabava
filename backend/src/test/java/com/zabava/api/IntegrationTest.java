package com.zabava.api;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.containing;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.matching;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.postgresql.PostgreSQLContainer;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

/**
 * Base des tests d'intégration : vrai Postgres 17 (Testcontainers) avec la migration
 * Supabase, sources externes simulées par WireMock, JWT HS256 signés comme Supabase,
 * horloge figée au 11 octobre 2026, 12 h UTC.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(IntegrationTest.FixedClock.class)
// JWT HS256 par défaut ; JwksIT surcharge avec un JWKS (priorité supérieure de @DynamicPropertySource).
@TestPropertySource(properties = "zabava.supabase.jwks-uri=")
public abstract class IntegrationTest {

    public static final Instant NOW = Instant.parse("2026-10-11T12:00:00Z");
    public static final String JWT_SECRET = "test-secret-with-at-least-32-bytes-for-hs256!";

    @ServiceConnection
    static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    protected static final WireMockServer WIREMOCK = new WireMockServer(wireMockConfig().dynamicPort());

    static {
        POSTGRES.start();
        WIREMOCK.start();
        applySchema();
    }

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        String base = WIREMOCK.baseUrl();
        registry.add("zabava.tmdb.base-url", () -> base + "/tmdb");
        registry.add("zabava.tmdb.api-key", () -> "eyJ-test-v4-read-access-token-longer-than-32-characters");
        registry.add("zabava.omdb.base-url", () -> base + "/omdb");
        registry.add("zabava.omdb.api-key", () -> "omdb-test-key");
        registry.add("zabava.tvmaze.base-url", () -> base + "/tvmaze");
        registry.add("zabava.supabase.url", () -> base + "/supabase");
        registry.add("zabava.supabase.service-role-key", () -> "service-role-test");
        registry.add("zabava.supabase.jwt-secret", () -> JWT_SECRET);
        // Index des personnes populaires : chargé à la main par les tests qui en ont besoin.
        registry.add("zabava.popular-people-pages", () -> 0);
        registry.add("zabava.expo.base-url", () -> base + "/expo");
        // Tâches planifiées : appelées à la main par les tests.
        registry.add("zabava.jobs.enabled", () -> false);
    }

    @TestConfiguration
    static class FixedClock {
        @Bean
        @Primary
        Clock testClock() {
            return Clock.fixed(NOW, ZoneOffset.UTC);
        }
    }

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected JdbcClient db;

    @Autowired
    protected CacheManager caches;

    @BeforeEach
    void resetState() {
        WIREMOCK.resetAll();
        caches.getCacheNames().forEach(name -> caches.getCache(name).clear());
        db.sql("""
                truncate table auth.users, profiles, user_providers, push_tokens, titles, seasons, episodes,
                  release_dates, title_availability, providers, provider_regions, user_titles, user_episodes,
                  notifications_log, follows, follow_removals, follow_quota, reports,
                  activities, recent_profile_visits restart identity cascade
                """).update();
    }

    // ─── Utilisateurs et JWT ──────────────────────────────────────────────────

    /** Crée un utilisateur Supabase ; le trigger crée son profil. */
    protected UUID createUser(String email) {
        UUID id = UUID.randomUUID();
        db.sql("""
                insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
                values (:id, :email, cast(:meta as jsonb), cast('{"provider":"google"}' as jsonb))
                """)
                .param("id", id)
                .param("email", email)
                .param("meta", "{\"full_name\":\"" + email.substring(0, email.indexOf('@')) + "\"}")
                .update();
        return id;
    }

    protected static String token(UUID userId) {
        return sign(new JWTClaimsSet.Builder()
                .subject(userId.toString())
                .audience("authenticated")
                .claim("role", "authenticated")
                .claim("email", "user@example.com")
                .issueTime(Date.from(Instant.now()))
                .expirationTime(Date.from(Instant.now().plusSeconds(3600)))
                .build());
    }

    protected static String sign(JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(JWT_SECRET.getBytes(StandardCharsets.UTF_8)));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException(e);
        }
    }

    protected static <T extends MockHttpServletRequestBuilder> T as(UUID userId, T request) {
        request.header("Authorization", "Bearer " + token(userId));
        return request;
    }

    // ─── Sources simulées ─────────────────────────────────────────────────────

    protected static String fixture(String name) {
        try {
            return new ClassPathResource("fixtures/" + name).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Fiches TMDB, saisons, TVmaze et OMDb des titres de test : 603 (film), 1399 (série), 209867 (animé). */
    protected static void stubCatalog() {
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/movie/603"))
                .willReturn(okJson(fixture("tmdb-movie-603.json"))));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/collection/9001")).willReturn(okJson("""
                {"id": 9001, "name": "L'Odyssée - Saga", "parts": [
                  {"id": 603, "title": "L'Odyssée", "release_date": "2026-07-17"},
                  {"id": 604, "title": "L'Odyssée 2", "release_date": "2028-07-17"},
                  {"id": 602, "title": "L'Iliade", "release_date": "2024-07-17"}]}
                """)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/tv/1399"))
                .withQueryParam("append_to_response", containing("credits"))
                .willReturn(okJson(fixture("tmdb-tv-1399.json"))));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/tv/1399"))
                .withQueryParam("append_to_response", matching("season/.*"))
                .willReturn(okJson(fixture("tmdb-tv-1399-seasons.json"))));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/tv/209867"))
                .withQueryParam("append_to_response", containing("credits"))
                .willReturn(okJson(fixture("tmdb-tv-209867.json"))));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/tv/209867"))
                .withQueryParam("append_to_response", matching("season/.*"))
                .willReturn(okJson(fixture("tmdb-tv-209867-seasons.json"))));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tvmaze/lookup/shows"))
                .withQueryParam("imdb", matching("tt14452776"))
                .willReturn(okJson("{\"id\": 6}")));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tvmaze/shows/6/episodes")).willReturn(okJson("""
                [{"season": 1, "number": 1, "airstamp": "2026-09-02T01:00:00+00:00"},
                 {"season": 1, "number": 2, "airstamp": "2026-10-02T01:00:00+00:00"},
                 {"season": 1, "number": 3, "airstamp": "2026-10-14T01:00:00+00:00"}]
                """)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/omdb/")).willReturn(okJson("""
                {"Response": "True", "imdbRating": "8.5", "imdbVotes": "640,312",
                 "Ratings": [{"Source": "Internet Movie Database", "Value": "8.5/10"},
                             {"Source": "Rotten Tomatoes", "Value": "92%"}]}
                """)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/movie/404"))
                .willReturn(aResponse().withStatus(404).withBody("{\"status_code\": 34}")));
    }

    // ─── Schéma ───────────────────────────────────────────────────────────────

    /** Applique l'imitation du schéma auth de Supabase, puis la vraie migration du dépôt. */
    private static void applySchema() {
        try (Connection c = DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
                Statement statement = c.createStatement()) {
            statement.execute(new ClassPathResource("db/auth-stub.sql").getContentAsString(StandardCharsets.UTF_8));
            for (Path migration : migrations()) {
                statement.execute(Files.readString(migration, StandardCharsets.UTF_8));
            }
        } catch (SQLException | IOException e) {
            throw new IllegalStateException("Schéma de test impossible à appliquer", e);
        }
    }

    /** Toutes les migrations du dépôt, dans l'ordre de leur numéro. */
    private static List<Path> migrations() throws IOException {
        Path fromBackend = Path.of("..", "supabase", "migrations");
        Path dir = Files.isDirectory(fromBackend) ? fromBackend : Path.of("supabase", "migrations");
        try (var files = Files.list(dir)) {
            return files.filter(p -> p.toString().endsWith(".sql")).sorted().toList();
        }
    }
}
