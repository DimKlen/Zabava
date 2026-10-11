package com.zabava.api.omdb;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import com.zabava.api.common.Json;
import com.zabava.api.config.AppProperties;
import com.zabava.api.config.CacheConfig;

import tools.jackson.databind.JsonNode;

/** Notes IMDb et Rotten Tomatoes (OMDb, ~1 000 appels par jour en gratuit : cache 7 jours). */
@Component
public class OmdbClient {

    public record Ratings(Double imdbRating, Integer imdbVotes, Integer rtScore) {
        public static final Ratings NONE = new Ratings(null, null, null);
    }

    private final RestClient http;
    private final String apiKey;

    public OmdbClient(AppProperties props, JdkClientHttpRequestFactory requestFactory) {
        this.apiKey = props.omdb().apiKey();
        this.http = RestClient.builder().baseUrl(props.omdb().baseUrl()).requestFactory(requestFactory).build();
    }

    public boolean enabled() {
        return StringUtils.hasText(apiKey);
    }

    @Cacheable(cacheNames = CacheConfig.OMDB, key = "'title:' + #imdbId")
    public Ratings ratings(String imdbId) {
        if (!enabled() || imdbId == null) return Ratings.NONE;
        JsonNode body = http.get()
                .uri(b -> b.path("/").queryParam("i", imdbId).queryParam("apikey", apiKey).build())
                .retrieve()
                .body(JsonNode.class);
        if (body == null || !"True".equals(Json.text(body, "Response"))) return Ratings.NONE;
        Integer rt = null;
        for (JsonNode rating : Json.array(body, "Ratings")) {
            if ("Rotten Tomatoes".equals(Json.text(rating, "Source"))) rt = percent(Json.text(rating, "Value"));
        }
        return new Ratings(number(Json.text(body, "imdbRating")), votes(Json.text(body, "imdbVotes")), rt);
    }

    /** « 8.5 » → 8.5 ; « N/A » → null. */
    static Double number(String value) {
        try {
            return value == null ? null : Double.valueOf(value);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** « 640,312 » → 640312. */
    static Integer votes(String value) {
        if (value == null) return null;
        try {
            return Integer.valueOf(value.replace(",", ""));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** « 92% » → 92. */
    static Integer percent(String value) {
        if (value == null || !value.endsWith("%")) return null;
        try {
            return Integer.valueOf(value.substring(0, value.length() - 1));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
