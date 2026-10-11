package com.zabava.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

/**
 * Exporte le contrat OpenAPI dans {@code build/openapi.json} : source des types TypeScript
 * de l'app ({@code cd mobile && npm run api:types}).
 */
class OpenApiExportIT extends IntegrationTest {

    @Test
    void exporteLeContrat() throws Exception {
        String spec = mvc.perform(get("/api/docs"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
        assertThat(spec).contains("/api/v1/me/watchlist", "/api/v1/titles/{type}/{tmdbId}");
        Path out = Path.of("build", "openapi.json");
        Files.createDirectories(out.getParent());
        Files.writeString(out, spec, StandardCharsets.UTF_8);
    }
}
