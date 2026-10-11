package com.zabava.api.common;

import java.util.Locale;

/** Type de titre côté client : movie, tv ou anime (anime = série TMDB classée animé). */
public enum MediaType {
    MOVIE,
    TV,
    ANIME;

    public static MediaType parse(String value) {
        try {
            return valueOf(value.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException | NullPointerException e) {
            throw ApiException.badRequest("Type inconnu : " + value);
        }
    }

    public String key() {
        return name().toLowerCase(Locale.ROOT);
    }

    /** media_type en base et dans TMDB : un animé reste une série. */
    public String tmdbType() {
        return this == MOVIE ? "movie" : "tv";
    }

    public boolean isSeries() {
        return this != MOVIE;
    }

    public static MediaType of(String tmdbType, boolean anime) {
        if ("movie".equals(tmdbType)) return MOVIE;
        return anime ? ANIME : TV;
    }
}
