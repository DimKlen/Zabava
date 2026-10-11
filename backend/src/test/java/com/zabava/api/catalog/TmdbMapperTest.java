package com.zabava.api.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Règles de classement et de présentation (specs/docs/01 §2, docs/03 › ProviderLogo). */
class TmdbMapperTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();

    private static JsonNode json(String raw) {
        return JSON.readTree(raw);
    }

    @Test
    void animationJaponaiseEstUnAnime() {
        assertThat(TmdbMapper.isAnime(json("{\"genre_ids\": [16, 10765], \"origin_country\": [\"JP\"]}"))).isTrue();
        assertThat(TmdbMapper.isAnime(json("{\"genres\": [{\"id\": 16}], \"origin_country\": [\"JP\"]}"))).isTrue();
    }

    @Test
    void motCleAnimeSuffitAvecLeGenreAnimation() {
        assertThat(TmdbMapper.isAnime(json("""
                {"genres": [{"id": 16}], "origin_country": ["US"], "keywords": {"results": [{"id": 210024}]}}
                """))).isTrue();
    }

    @Test
    void animationAmericaineResteUneSerie() {
        assertThat(TmdbMapper.isAnime(json("{\"genre_ids\": [16], \"origin_country\": [\"US\"]}"))).isFalse();
    }

    @Test
    void seriesJaponaiseSansAnimationResteUneSerie() {
        assertThat(TmdbMapper.isAnime(json("{\"genre_ids\": [18], \"origin_country\": [\"JP\"]}"))).isFalse();
    }

    @Test
    void lesFilmsNeSontJamaisDesAnimes() {
        var lite = TmdbMapper.lite(json("""
                {"id": 1, "title": "Le Garçon et le Héron", "genre_ids": [16], "origin_country": ["JP"],
                 "release_date": "2023-07-14"}
                """), "movie");
        assertThat(lite.type()).isEqualTo("movie");
        assertThat(lite.id()).isEqualTo("movie-1");
        assertThat(lite.year()).isEqualTo(2023);
    }

    @ParameterizedTest
    @CsvSource({
        "Netflix, N",
        "Amazon Prime Video, pv",
        "Disney Plus, D+",
        "Crave, C",
        "Apple TV Plus, tv",
        "Crunchyroll, CR",
        "Paramount Plus, P+",
        "Mubi, Mu",
        "TF1, TF1"
    })
    void abreviationsDesPlateformes(String name, String expected) {
        assertThat(TmdbMapper.shortName(name)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"en, Anglais", "ja, Japonais", "fr, Français", "ko, Coréen"})
    void nomDeLangueEnFrancais(String code, String expected) {
        assertThat(TmdbMapper.languageName(code)).isEqualTo(expected);
    }

    @Test
    void datesInvalidesIgnorees() {
        assertThat(TmdbMapper.date("")).isNull();
        assertThat(TmdbMapper.date("2026-13-45")).isNull();
        assertThat(TmdbMapper.date("2026-10-20T00:00:00.000Z")).hasToString("2026-10-20");
    }
}
