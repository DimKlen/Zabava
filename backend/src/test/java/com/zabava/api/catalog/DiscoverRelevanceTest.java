package com.zabava.api.catalog;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;

class DiscoverRelevanceTest {

    private static TitleLite title(String id, String name, Double popularity) {
        return new TitleLite(id, 0, "movie", name, null, null, null, null, null, null, popularity, null, null);
    }

    @Test
    void titreExactPuisPlusPopulaire() {
        List<TitleLite> titles = new ArrayList<>(List.of(
                title("movie-1", "Fight Club 2", 80.0),
                title("movie-2", "Fight Club", 5.0),
                title("movie-3", "Fight Club", 60.0),
                title("movie-4", "Club de combat", null)));

        titles.sort(DiscoverService.byRelevance("fight club"));

        assertThat(titles).extracting(TitleLite::id).containsExactly("movie-3", "movie-2", "movie-1", "movie-4");
    }
}
