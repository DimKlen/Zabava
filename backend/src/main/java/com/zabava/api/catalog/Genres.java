package com.zabava.api.catalog;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Les 10 genres de l'app (recherche avancée, Découvrir › Par genre) et leurs ids TMDB,
 * qui diffèrent entre films et séries (specs/docs/08 §8.2).
 *
 * <p>TMDB n'a pas de genre « Horreur » ni « Thriller » pour les séries : on retient
 * « Mystère » (9648) pour les deux, l'approximation la plus proche.
 */
public final class Genres {

    private Genres() {}

    public record Genre(String key, String label, Integer movieId, Integer tvId) {}

    public static final List<Genre> ALL = List.of(
            new Genre("action", "Action", 28, 10759),
            new Genre("aventure", "Aventure", 12, 10759),
            new Genre("comedie", "Comédie", 35, 35),
            new Genre("drame", "Drame", 18, 18),
            new Genre("fantastique", "Fantastique", 14, 10765),
            new Genre("horreur", "Horreur", 27, 9648),
            new Genre("science-fiction", "Science-fiction", 878, 10765),
            new Genre("thriller", "Thriller", 53, 9648),
            new Genre("animation", "Animation", 16, 16),
            new Genre("documentaire", "Documentaire", 99, 99));

    private static final Map<String, Genre> BY_KEY = new LinkedHashMap<>();

    static {
        ALL.forEach(g -> BY_KEY.put(g.key(), g));
    }

    public static Genre byKey(String key) {
        Genre genre = BY_KEY.get(key);
        if (genre == null) throw new IllegalArgumentException("Genre inconnu : " + key);
        return genre;
    }

    /** Ids TMDB des genres demandés pour un type (sans doublon). */
    public static List<Integer> tmdbIds(List<String> keys, boolean movie) {
        return keys.stream()
                .map(Genres::byKey)
                .map(g -> movie ? g.movieId() : g.tvId())
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }
}
