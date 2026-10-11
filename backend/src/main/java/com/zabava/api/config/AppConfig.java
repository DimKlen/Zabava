package com.zabava.api.config;

import java.time.Clock;

import org.springdoc.core.utils.SpringDocUtils;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.zabava.api.auth.CurrentUser;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class AppConfig {

    static {
        // L'utilisateur vient du JWT, pas des paramètres de la requête.
        SpringDocUtils.getConfig().addRequestWrapperToIgnore(CurrentUser.class);
    }

    /** Horloge injectable : les tests figent « aujourd'hui ». */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }

    /** Documentation servie sur /api/docs ; types TypeScript générés pour mobile/src/api/types.ts. */
    @Bean
    OpenAPI openApi() {
        return new OpenAPI()
                .info(new Info().title("Zabava API").version("v1"))
                .components(new Components().addSecuritySchemes("supabase",
                        new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList("supabase"));
    }
}
