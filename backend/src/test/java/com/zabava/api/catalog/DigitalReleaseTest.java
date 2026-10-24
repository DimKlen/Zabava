package com.zabava.api.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.zabava.api.catalog.TitleService.DigitalRelease;

class DigitalReleaseTest {

    private static final LocalDate NOV_17 = LocalDate.of(2026, 11, 17);
    private static final LocalDate DEC_1 = LocalDate.of(2026, 12, 1);

    @Test
    void maRegionDAbord() {
        var byRegion = Map.of(
                "CA", Map.of("salle", LocalDate.of(2026, 7, 17), "numerique", DEC_1),
                "US", Map.of("numerique", NOV_17));

        assertThat(TitleService.digitalRelease(byRegion, "CA")).isEqualTo(new DigitalRelease(DEC_1, "CA"));
    }

    @Test
    void sinonLaPlusTotAilleurs() {
        // « L'Odyssée » : TMDB n'a que la sortie en salle au Canada, la date numérique est américaine.
        var byRegion = Map.of(
                "CA", Map.of("salle", LocalDate.of(2026, 7, 17)),
                "GB", Map.of("numerique", DEC_1),
                "US", Map.of("numerique", NOV_17, "physique", NOV_17));

        assertThat(TitleService.digitalRelease(byRegion, "CA")).isEqualTo(new DigitalRelease(NOV_17, "US"));
    }

    @Test
    void aucuneDateNumerique() {
        var byRegion = Map.of("CA", Map.of("salle", LocalDate.of(2026, 7, 17)));

        assertThat(TitleService.digitalRelease(byRegion, "CA").date()).isNull();
        assertThat(TitleService.digitalRelease(Map.of(), "CA").country()).isNull();
    }
}
