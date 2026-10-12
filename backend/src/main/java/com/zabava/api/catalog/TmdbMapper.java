package com.zabava.api.catalog;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.zabava.api.catalog.dto.CatalogDtos.PersonLite;
import com.zabava.api.catalog.dto.CatalogDtos.Provider;
import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;
import com.zabava.api.common.Json;
import com.zabava.api.common.MediaType;
import com.zabava.api.common.TitleRef;

import tools.jackson.databind.JsonNode;

/** Conversion du JSON TMDB vers les objets de l'API, et règles de classement. */
public final class TmdbMapper {

    private TmdbMapper() {}

    public static final int ANIMATION_GENRE = 16;
    public static final int ANIME_KEYWORD = 210024;

    /** Abréviations des pastilles de plateformes (specs/docs/03 › ProviderLogo). */
    private static final Map<String, String> SHORT_NAMES = Map.of(
            "Netflix", "N",
            "Amazon Prime Video", "pv",
            "Prime Video", "pv",
            "Disney Plus", "D+",
            "Disney+", "D+",
            "Crave", "C",
            "Apple TV Plus", "tv",
            "Apple TV+", "tv",
            "Crunchyroll", "CR",
            "Paramount Plus", "P+");

    /**
     * Une série est un animé si elle a le genre Animation et soit le Japon comme pays d'origine,
     * soit le mot-clé TMDB « anime » (specs/docs/01 §2). Les films ne sont jamais classés animés :
     * l'onglet Animés suit des épisodes.
     */
    public static boolean isAnime(JsonNode tv) {
        boolean animation = genreIds(tv).contains(ANIMATION_GENRE);
        if (!animation) return false;
        boolean japanese = Json.array(tv, "origin_country").stream().anyMatch(c -> "JP".equals(c.asString("")));
        return japanese || keywordIds(tv).contains(ANIME_KEYWORD);
    }

    /** Ids de genre d'un résultat de liste ({@code genre_ids}) ou d'une fiche ({@code genres}). */
    static Set<Integer> genreIds(JsonNode node) {
        var ids = new java.util.HashSet<Integer>();
        Json.array(node, "genre_ids").forEach(g -> ids.add(g.asInt(-1)));
        Json.array(node, "genres").forEach(g -> ids.add(g.path("id").asInt(-1)));
        return ids;
    }

    /** Mots-clés d'une fiche : {@code keywords.keywords} (film) ou {@code keywords.results} (série). */
    static Set<Integer> keywordIds(JsonNode node) {
        var ids = new java.util.HashSet<Integer>();
        JsonNode keywords = node.path("keywords");
        Json.array(keywords, "keywords").forEach(k -> ids.add(k.path("id").asInt(-1)));
        Json.array(keywords, "results").forEach(k -> ids.add(k.path("id").asInt(-1)));
        return ids;
    }

    /** Type client d'un résultat ; {@code tmdbType} sert quand le JSON n'a pas de media_type. */
    public static MediaType mediaType(JsonNode node, String tmdbType) {
        String type = Json.text(node, "media_type");
        if (type == null) type = tmdbType;
        return MediaType.of(type, "tv".equals(type) && isAnime(node));
    }

    public static TitleLite lite(JsonNode node, String tmdbType) {
        MediaType type = mediaType(node, tmdbType);
        int tmdbId = node.path("id").asInt();
        LocalDate date = date(Json.text(node, type == MediaType.MOVIE ? "release_date" : "first_air_date"));
        return new TitleLite(
                TitleRef.format(type, tmdbId),
                tmdbId,
                type.key(),
                title(node),
                Json.text(node, type == MediaType.MOVIE ? "original_title" : "original_name"),
                date == null ? null : date.getYear(),
                Json.text(node, "poster_path"),
                Json.text(node, "backdrop_path"),
                Json.text(node, "overview"),
                date,
                Json.decimal(node, "popularity"),
                Json.decimal(node, "vote_average"));
    }

    public static String title(JsonNode node) {
        String title = Json.text(node, "title");
        return title != null ? title : Json.text(node, "name");
    }

    public static PersonLite person(JsonNode node) {
        List<String> knownFor = new ArrayList<>();
        for (JsonNode work : Json.array(node, "known_for")) {
            String title = title(work);
            if (title != null && knownFor.size() < 2) knownFor.add(title);
        }
        return new PersonLite(node.path("id").asInt(), Json.text(node, "name"), Json.text(node, "profile_path"), knownFor);
    }

    public static Provider provider(JsonNode node, String shortName, String link) {
        String name = Json.text(node, "provider_name");
        return new Provider(
                node.path("provider_id").asInt(),
                name,
                shortName != null ? shortName : shortName(name),
                Json.text(node, "logo_path"),
                link);
    }

    /** Abréviation connue, sinon les deux premières lettres. */
    public static String shortName(String name) {
        if (name == null) return "";
        String known = SHORT_NAMES.get(name);
        if (known != null) return known;
        String letters = name.replaceAll("[^\\p{L}\\p{N}+]", "");
        return letters.length() <= 3 ? letters : letters.substring(0, 2);
    }

    public static LocalDate date(String value) {
        if (value == null || value.length() < 10) return null;
        try {
            return LocalDate.parse(value.substring(0, 10));
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Nom de langue en français, première lettre en majuscule : « en » → « Anglais ». */
    public static String languageName(String code) {
        if (code == null) return null;
        String name = Locale.forLanguageTag(code).getDisplayLanguage(Locale.FRENCH);
        if (name.isBlank() || name.equals(code)) return code;
        return name.substring(0, 1).toUpperCase(Locale.FRENCH) + name.substring(1);
    }

    /** Langue TMDB des contenus : fr-CA, fr-FR, en-CA, en-US. */
    public static String languagePrefix(String language) {
        return language == null ? "fr" : language.substring(0, 2);
    }
}
