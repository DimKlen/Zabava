package com.zabava.api.omdb;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** Lecture des valeurs textuelles d'OMDb. */
class OmdbClientTest {

    @Test
    void noteIMDb() {
        assertThat(OmdbClient.number("8.5")).isEqualTo(8.5);
        assertThat(OmdbClient.number("N/A")).isNull();
        assertThat(OmdbClient.number(null)).isNull();
    }

    @Test
    void votesAvecSeparateurs() {
        assertThat(OmdbClient.votes("640,312")).isEqualTo(640_312);
        assertThat(OmdbClient.votes("1,412,000")).isEqualTo(1_412_000);
        assertThat(OmdbClient.votes("N/A")).isNull();
    }

    @Test
    void pourcentageRottenTomatoes() {
        assertThat(OmdbClient.percent("92%")).isEqualTo(92);
        assertThat(OmdbClient.percent("8.5/10")).isNull();
        assertThat(OmdbClient.percent(null)).isNull();
    }
}
