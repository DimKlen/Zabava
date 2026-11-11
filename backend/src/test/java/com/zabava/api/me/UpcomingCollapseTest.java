package com.zabava.api.me;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.zabava.api.me.dto.MeDtos.UpcomingEvent;

class UpcomingCollapseTest {

    private static UpcomingEvent episode(int season, int number, LocalDate date) {
        return new UpcomingEvent(date, "episode", null, season, number, null, "Netflix");
    }

    @Test
    void saisonSortieDUnCoupEnUneSeuleLigne() {
        LocalDate day = LocalDate.of(2026, 11, 20);
        List<UpcomingEvent> episodes = new ArrayList<>();
        for (int n = 1; n <= 12; n++) episodes.add(episode(1, n, day));

        List<UpcomingEvent> result = UpcomingService.collapseBatchDrops(episodes);

        assertThat(result).hasSize(1);
        assertThat(result.getFirst().season()).isEqualTo(1);
        assertThat(result.getFirst().episode()).isNull();
        assertThat(result.getFirst().provider()).isEqualTo("Netflix");
    }

    @Test
    void diffusionHebdomadaireInchangee() {
        List<UpcomingEvent> episodes = List.of(
                episode(1, 1, LocalDate.of(2026, 11, 20)),
                episode(1, 2, LocalDate.of(2026, 11, 27)),
                episode(1, 3, LocalDate.of(2026, 12, 4)));

        assertThat(UpcomingService.collapseBatchDrops(episodes)).isEqualTo(episodes);
    }

    @Test
    void deuxEpisodesLeMemeJourRestentSepares() {
        LocalDate day = LocalDate.of(2026, 11, 20);
        List<UpcomingEvent> episodes = List.of(episode(1, 1, day), episode(1, 2, day));

        assertThat(UpcomingService.collapseBatchDrops(episodes)).hasSize(2);
    }
}
