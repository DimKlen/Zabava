package com.zabava.api.social;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

/** Règles pures : pseudos, avancement des séries, curseurs. */
class UsernamesTest {

    @Test
    void formatDesPseudos() {
        assertThat(Usernames.isWellFormed("dim.k")).isTrue();
        assertThat(Usernames.isWellFormed("a_b.c9")).isTrue();
        assertThat(Usernames.isWellFormed("ab")).isFalse();
        assertThat(Usernames.isWellFormed("a".repeat(21))).isFalse();
        assertThat(Usernames.isWellFormed("Dim")).isFalse();
        assertThat(Usernames.isWellFormed("éloïse")).isFalse();
        assertThat(Usernames.isReserved("settings")).isTrue();
    }

    @Test
    void propositionsDansLOrdreDeLaSpec() {
        assertThat(Usernames.candidates("dim.k", 7))
                .containsExactly("dim.k.tv", "dim.k_26", "dim.k.zab", "dim.k2", "dim.k.film", "dim.k3", "dim.k4");
        // Base sans ponctuation finale, coupée à 15 caractères.
        assertThat(Usernames.candidates("lea._", 1)).containsExactly("lea.tv");
        assertThat(Usernames.candidates("abcdefghijklmnopqrst", 1)).containsExactly("abcdefghijklmno.tv");
    }

    @Test
    void requeteDeRecherche() {
        assertThat(Usernames.searchQuery("  @Éloïse ")).isEqualTo("eloise");
        assertThat(Usernames.searchQuery("Léa Ma")).isEqualTo("lea ma");
    }

    @Test
    void avancementDesSeries() {
        assertThat(progress("following", false, 3, 0).bucket()).isEqualTo("towatch");
        assertThat(progress("following", false, 3, 1).bucket()).isEqualTo("in_progress");
        assertThat(progress("following", false, 3, 3).bucket()).isEqualTo("in_progress");
        assertThat(progress("following", true, 3, 3).bucket()).isEqualTo("finished");
        assertThat(progress("abandoned", true, 3, 3).bucket()).isEqualTo("abandoned");
        assertThat(progress("following", false, 3, 1).progressPct()).isEqualTo(33);
        assertThat(new SeriesProgress("following", false, 3, 1, 1, null, null, 2, 5).lastCode()).isEqualTo("S02 E05");
    }

    @Test
    void curseurDuFilAllerRetour() {
        Instant at = Instant.parse("2026-10-11T12:00:00.123456Z");
        Cursors.FeedPosition position = Cursors.feed(Cursors.feed(at, 42));
        assertThat(position.at()).isEqualTo(at);
        assertThat(position.id()).isEqualTo(42);
    }

    private static SeriesProgress progress(String status, boolean ended, int aired, int airedWatched) {
        return new SeriesProgress(status, ended, aired, airedWatched, airedWatched, null, null, null, null);
    }
}
