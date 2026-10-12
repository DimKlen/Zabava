package com.zabava.api.auth;

import java.util.Map;
import java.util.UUID;

import org.springframework.security.oauth2.jwt.Jwt;

/** Utilisateur authentifié, extrait du JWT Supabase. */
public record CurrentUser(UUID id, String email, String displayName, String avatarUrl, String provider) {

    public static CurrentUser from(Jwt jwt) {
        Map<String, Object> meta = jwt.getClaimAsMap("user_metadata");
        Map<String, Object> app = jwt.getClaimAsMap("app_metadata");
        return new CurrentUser(
                UUID.fromString(jwt.getSubject()),
                jwt.getClaimAsString("email"),
                firstText(meta, "full_name", "name"),
                firstText(meta, "avatar_url"),
                firstText(app, "provider"));
    }

    private static String firstText(Map<String, Object> claims, String... keys) {
        if (claims == null) return null;
        for (String key : keys) {
            Object value = claims.get(key);
            if (value instanceof String s && !s.isBlank()) return s;
        }
        return null;
    }
}
