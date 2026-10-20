package com.zabava.api.providers;

import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.okJson;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.zabava.api.IntegrationTest;

/** Seed des plateformes d'abonnement pour CA, FR, BE, CH, US (étape 3, tâche 1). */
class ProviderSeedIT extends IntegrationTest {

    @Autowired
    private ProviderService providers;

    @Test
    void seedDesCinqRegionsIdempotent() {
        String body = """
                {"results": [
                  {"provider_id": 8, "provider_name": "Netflix", "logo_path": "/n.jpg",
                   "display_priority": 5, "display_priorities": {"CA": 1, "FR": 2}},
                  {"provider_id": 230, "provider_name": "Crave", "logo_path": "/c.jpg", "display_priority": 3}]}
                """;
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/watch/providers/movie")).willReturn(okJson(body)));
        WIREMOCK.stubFor(get(urlPathEqualTo("/tmdb/watch/providers/tv")).willReturn(okJson(body)));

        providers.seed();
        providers.seed();

        // Un appel par région : le second seed passe par le cache TMDB de 24 h.
        for (String region : ProviderService.REGIONS) {
            WIREMOCK.verify(1, getRequestedFor(urlPathEqualTo("/tmdb/watch/providers/movie"))
                    .withQueryParam("watch_region", equalTo(region)));
        }
        assertThat(db.sql("select count(*) from providers").query(Long.class).single()).isEqualTo(2);
        assertThat(db.sql("select count(*) from provider_regions").query(Long.class).single()).isEqualTo(2L * ProviderService.REGIONS.size());
        assertThat(db.sql("select short from providers where id = 8").query(String.class).single()).isEqualTo("N");
        // Meilleure priorité parmi les pays (Netflix : 1 au Canada, Crave : 3).
        assertThat(providers.all()).extracting(p -> p.name()).containsExactly("Netflix", "Crave");
        assertThat(db.sql("select display_priority from provider_regions where provider_id = 8 and region = 'FR'")
                        .query(Integer.class).single())
                .isEqualTo(2);
    }
}
