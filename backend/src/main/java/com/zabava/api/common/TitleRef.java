package com.zabava.api.common;

/**
 * Identifiant client d'un titre : {@code "{type}-{tmdbId}"}, ex. {@code movie-693134},
 * {@code anime-209867} (specs/docs/02 §2).
 */
public record TitleRef(MediaType type, int tmdbId) {

    public static TitleRef parse(String id) {
        int dash = id == null ? -1 : id.lastIndexOf('-');
        if (dash <= 0) throw ApiException.badRequest("Identifiant de titre invalide : " + id);
        try {
            return new TitleRef(MediaType.parse(id.substring(0, dash)), Integer.parseInt(id.substring(dash + 1)));
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("Identifiant de titre invalide : " + id);
        }
    }

    public static String format(MediaType type, int tmdbId) {
        return type.key() + "-" + tmdbId;
    }

    @Override
    public String toString() {
        return format(type, tmdbId);
    }
}
