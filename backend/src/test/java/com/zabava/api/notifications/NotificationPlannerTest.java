package com.zabava.api.notifications;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.zabava.api.me.dto.MeDtos.NotificationPrefs;
import com.zabava.api.notifications.NotificationPlanner.Candidate;
import com.zabava.api.notifications.NotificationPlanner.LogKey;
import com.zabava.api.notifications.NotificationPlanner.Planned;
import com.zabava.api.notifications.NotificationPlanner.Type;

class NotificationPlannerTest {

    private static final ZoneId ZONE = ZoneId.of("America/Toronto");
    private static final ZonedDateTime NOW = ZonedDateTime.of(2026, 10, 11, 21, 30, 0, 0, ZONE);
    private static final NotificationPrefs ALL = new NotificationPrefs(true, true, true, true, 9, true);

    private static Candidate episode(long title, long episode, ZonedDateTime at) {
        return new Candidate(Type.EPISODE, title, episode, "Série " + title + " · S01 E0" + episode + " est disponible",
                "zabava://title/tv/" + title + "?tab=episodes&season=1&episode=" + episode, at);
    }

    private static Candidate of(Type type, long title, ZonedDateTime at) {
        return new Candidate(type, title, null, type + " " + title, "zabava://title/movie/" + title, at);
    }

    private static List<Planned> plan(List<Candidate> candidates) {
        return NotificationPlanner.plan(candidates, ALL, NOW, Set.of(), Set.of());
    }

    @Test
    void episodeAnnonceALHeureDeDiffusionSeulement() {
        List<Planned> planned = plan(List.of(
                episode(1, 1, NOW.minusMinutes(30)),
                episode(2, 1, NOW.plusMinutes(30)),
                episode(3, 1, NOW.minusHours(25))));
        assertThat(planned).extracting(Planned::text).containsExactly("Série 1 · S01 E01 est disponible");
        assertThat(planned.getFirst().url()).isEqualTo("zabava://title/tv/1?tab=episodes&season=1&episode=1");
    }

    @Test
    void uneSeuleNotificationParTitreEtParJour() {
        List<Planned> planned = NotificationPlanner.plan(
                List.of(episode(1, 1, NOW.minusHours(2)), episode(1, 2, NOW.minusHours(1)),
                        of(Type.SEASON, 1, NOW.minusHours(3)), episode(2, 1, NOW.minusHours(1))),
                ALL, NOW, Set.of(2L), Set.of());
        // Titre 2 déjà annoncé aujourd'hui ; titre 1 : l'épisode le plus ancien, les deux épisodes journalisés.
        assertThat(planned).hasSize(1);
        assertThat(planned.getFirst().text()).isEqualTo("Série 1 · S01 E01 est disponible");
        assertThat(planned.getFirst().keys()).containsExactly(
                new LogKey(Type.EPISODE, 1, 1L), new LogKey(Type.EPISODE, 1, 2L));
    }

    @Test
    void quatreEpisodesOuPlusRegroupes() {
        List<Planned> planned = plan(List.of(
                episode(1, 1, NOW.minusHours(1)), episode(2, 1, NOW.minusHours(1)),
                episode(3, 1, NOW.minusHours(1)), episode(3, 2, NOW.minusHours(1)),
                episode(4, 1, NOW.minusHours(1)),
                of(Type.CINEMA, 9, NOW.minusHours(12))));
        assertThat(planned).extracting(Planned::text)
                .containsExactly("5 nouveaux épisodes aujourd'hui", "CINEMA 9");
        assertThat(planned.getFirst().url()).isEqualTo("zabava://upcoming");
        assertThat(planned.getFirst().keys()).hasSize(5);
    }

    @Test
    void troisEpisodesNonRegroupes() {
        List<Planned> planned = plan(List.of(
                episode(1, 1, NOW.minusHours(1)), episode(2, 1, NOW.minusHours(1)), episode(3, 1, NOW.minusHours(1))));
        assertThat(planned).hasSize(3);
    }

    @Test
    void streamingEntre9hEt21h() {
        Candidate arrival = of(Type.STREAMING, 5, NOW.minusHours(1));
        assertThat(plan(List.of(arrival))).isEmpty();
        ZonedDateTime noon = NOW.withHour(12);
        assertThat(NotificationPlanner.plan(List.of(arrival), ALL, noon, Set.of(), Set.of())).isEmpty();
        assertThat(NotificationPlanner.plan(List.of(of(Type.STREAMING, 5, noon.minusHours(1))), ALL, noon, Set.of(), Set.of()))
                .hasSize(1);
    }

    @Test
    void typeCoupeOuDejaEnvoye() {
        NotificationPrefs noEpisodes = new NotificationPrefs(false, true, true, true, 9, true);
        assertThat(NotificationPlanner.plan(List.of(episode(1, 1, NOW.minusHours(1))), noEpisodes, NOW, Set.of(), Set.of()))
                .isEmpty();
        assertThat(NotificationPlanner.plan(List.of(episode(1, 1, NOW.minusHours(1))), ALL, NOW, Set.of(),
                Set.of(new LogKey(Type.EPISODE, 1, 1L)))).isEmpty();
    }
}
