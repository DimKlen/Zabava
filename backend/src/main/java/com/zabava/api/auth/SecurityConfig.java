package com.zabava.api.auth;

import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.spec.SecretKeySpec;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.util.StringUtils;

import com.zabava.api.config.AppProperties;

/**
 * Chaque requête de l'API porte le JWT Supabase de l'utilisateur ({@code sub} = profiles.id).
 * Vérification par le JWKS du projet (ES256, par défaut) ou, à défaut, par le secret HS256 historique.
 * Seuls la documentation OpenAPI et le health check sont publics.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/docs/**", "/swagger-ui/**", "/actuator/health")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .oauth2ResourceServer(rs -> rs.jwt(jwt -> {}))
                .build();
    }

    @Bean
    JwtDecoder jwtDecoder(AppProperties props) {
        AppProperties.Supabase supabase = props.supabase();
        NimbusJwtDecoder decoder;
        if (StringUtils.hasText(supabase.jwksUri())) {
            // Supabase signe désormais en ES256 (clés asymétriques) ; RS256 reste accepté.
            decoder = NimbusJwtDecoder.withJwkSetUri(supabase.jwksUri())
                    .jwsAlgorithms(algorithms -> {
                        algorithms.add(SignatureAlgorithm.ES256);
                        algorithms.add(SignatureAlgorithm.RS256);
                    })
                    .build();
        } else if (StringUtils.hasText(supabase.jwtSecret())) {
            var key = new SecretKeySpec(supabase.jwtSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        } else {
            throw new IllegalStateException("Configurer SUPABASE_JWKS_URI ou SUPABASE_JWT_SECRET");
        }
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(), new AuthenticatedUserValidator()));
        return decoder;
    }

    /** Refuse les jetons sans utilisateur (clé anon) : rôle « authenticated » et sub obligatoires. */
    static final class AuthenticatedUserValidator implements OAuth2TokenValidator<Jwt> {

        private static final OAuth2Error INVALID =
                new OAuth2Error("invalid_token", "Jeton sans utilisateur authentifié", null);

        @Override
        public OAuth2TokenValidatorResult validate(Jwt jwt) {
            boolean authenticated = "authenticated".equals(jwt.getClaimAsString("role"))
                    && StringUtils.hasText(jwt.getSubject());
            List<String> audience = jwt.getAudience();
            boolean audienceOk = audience == null || audience.isEmpty() || audience.contains("authenticated");
            return authenticated && audienceOk
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(INVALID);
        }
    }
}
