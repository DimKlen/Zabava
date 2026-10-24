package com.zabava.api.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;

class FuzzySearchTest {

    private static TitleLite title(String name, String original) {
        return new TitleLite("movie-1", 1, "movie", name, original, null, null, null, null, null, null, null, null);
    }

    @Test
    void variantesUnMotEnMoinsDernierMotRaccourciMotsColles() {
        assertThat(FuzzySearch.variants("Le diable tous"))
                .containsExactly("diable tous", "le tous", "le diable", "lediable tous", "le diabletous");
        // « tous » (4 lettres) n'est pas raccourci ; « interstelar » l'est, à 60 %.
        assertThat(FuzzySearch.variants("Interstelar")).containsExactly("interst");
        assertThat(FuzzySearch.variants("inter stellar")).contains("interstellar");
    }

    @Test
    void variantesBornees() {
        assertThat(FuzzySearch.variants("le diable tous le temps")).hasSize(FuzzySearch.MAX_VARIANTS);
        assertThat(FuzzySearch.variants("zen")).isEmpty();
        assertThat(FuzzySearch.variants("  ")).isEmpty();
        assertThat(FuzzySearch.variants("un deux trois quatre cinq six sept")).isEmpty();
    }

    @Test
    void titresProchesDeLaRequete() {
        assertThat(FuzzySearch.score("le diable tous le temps", title("Le Diable, tout le temps", null)))
                .isGreaterThanOrEqualTo(FuzzySearch.MIN_SCORE);
        assertThat(FuzzySearch.score("breking bad", title("Breaking Bad : Le chimiste", "Breaking Bad")))
                .isGreaterThanOrEqualTo(FuzzySearch.MIN_SCORE);
        // Le titre original compte aussi : « Interstellaire » en français.
        assertThat(FuzzySearch.score("interstelar", title("Interstellaire", "Interstellar")))
                .isGreaterThanOrEqualTo(FuzzySearch.MIN_SCORE);
        assertThat(FuzzySearch.score("inter stellar", title("Interstellar", null)))
                .isGreaterThanOrEqualTo(FuzzySearch.MIN_SCORE);
        assertThat(FuzzySearch.score("gam of thrones", title("Le Trône de fer", "Game of Thrones")))
                .isGreaterThanOrEqualTo(FuzzySearch.MIN_SCORE);
        assertThat(FuzzySearch.score("odyssee", title("L'Odyssée", null))).isEqualTo(1);
    }

    @Test
    void titresEloignesEcartes() {
        assertThat(FuzzySearch.score("breking bad", title("Bad Girls", null))).isLessThan(FuzzySearch.MIN_SCORE);
        assertThat(FuzzySearch.score("interstelar", title("Interstate 60", null))).isLessThan(FuzzySearch.MIN_SCORE);
        assertThat(FuzzySearch.score("le diable tous le temps", title("Le Diable s'habille en Prada", null)))
                .isLessThan(FuzzySearch.MIN_SCORE);
        // Quatre mots sur cinq, mais pas « diable » : documentaire « …de tous les temps » écarté.
        assertThat(FuzzySearch.score("le diable tous le temps",
                title("Queen, « We Are the Champions » : Le Plus Grand Hymne sportif de tous les temps", null)))
                .isLessThan(FuzzySearch.MIN_SCORE);
        assertThat(FuzzySearch.score("dune", title(null, null))).isZero();
    }
}
