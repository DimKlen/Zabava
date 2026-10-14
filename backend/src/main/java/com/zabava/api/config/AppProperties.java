package com.zabava.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Configuration externe (variables d'environnement de specs/docs/11 §6). */
@ConfigurationProperties(prefix = "zabava")
public record AppProperties(Supabase supabase, Tmdb tmdb, Omdb omdb, Tvmaze tvmaze, Expo expo, Jobs jobs) {

    /**
     * @param url URL du projet Supabase (Admin API pour DELETE /me)
     * @param jwtSecret secret HS256 des JWT (projets Supabase historiques)
     * @param jwksUri JWKS des JWT asymétriques (ES256), prioritaire ; vide pour utiliser jwtSecret
     * @param serviceRoleKey clé service_role (Admin API)
     */
    public record Supabase(String url, String jwtSecret, String jwksUri, String serviceRoleKey) {}

    /** @param apiKey jeton « API Read Access Token » (v4, bearer) */
    public record Tmdb(String baseUrl, String apiKey) {}

    public record Omdb(String baseUrl, String apiKey) {}

    public record Tvmaze(String baseUrl) {}

    /** @param accessToken jeton EXPO_ACCESS_TOKEN (facultatif : sécurité renforcée des envois) */
    public record Expo(String baseUrl, String accessToken) {}

    /** @param enabled tâches planifiées actives (coupées dans les tests) */
    public record Jobs(boolean enabled) {}
}
