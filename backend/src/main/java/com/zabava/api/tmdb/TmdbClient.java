package com.zabava.api.tmdb;

import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriBuilder;

import com.zabava.api.config.AppProperties;
import com.zabava.api.config.CacheConfig;

import tools.jackson.databind.JsonNode;

/**
 * Client TMDB API v3. Accepte le jeton v4 (bearer, recommandé) ou une clé v3 courte.
 * Les réponses sont mises en cache 24 h ({@link #get}) ou 10 min ({@link #search}).
 */
@Component
public class TmdbClient {

    /** Les clés v3 font 32 caractères ; les jetons v4 sont des JWT bien plus longs. */
    private static final int V3_KEY_LENGTH = 32;

    private final RestClient http;
    private final String v3Key;

    public TmdbClient(AppProperties props, JdkClientHttpRequestFactory requestFactory) {
        String key = props.tmdb().apiKey();
        boolean isV3 = StringUtils.hasText(key) && key.length() <= V3_KEY_LENGTH;
        this.v3Key = isV3 ? key : null;
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(props.tmdb().baseUrl())
                .requestFactory(requestFactory);
        if (StringUtils.hasText(key) && !isV3) builder.defaultHeader("Authorization", "Bearer " + key);
        this.http = builder.build();
    }

    /** Requête mise en cache 24 h (fiches, listes, Découvrir). */
    @Cacheable(cacheNames = CacheConfig.TMDB, key = "#path + #query")
    public JsonNode get(String path, TreeMap<String, String> query) {
        return fetch(path, query);
    }

    /** Requête mise en cache 10 min (recherche). */
    @Cacheable(cacheNames = CacheConfig.TMDB_SEARCH, key = "#path + #query")
    public JsonNode search(String path, TreeMap<String, String> query) {
        return fetch(path, query);
    }

    private JsonNode fetch(String path, Map<String, String> query) {
        return http.get().uri(builder -> uri(builder, path, query)).retrieve().body(JsonNode.class);
    }

    /** Valeurs passées en variables d'URI : virgules, « | » et accents sont encodés strictement. */
    private URI uri(UriBuilder builder, String path, Map<String, String> query) {
        builder.path(path);
        Map<String, Object> variables = new HashMap<>();
        query.forEach((name, value) -> {
            if (value == null) return;
            builder.queryParam(name, "{" + name + "}");
            variables.put(name, value);
        });
        if (v3Key != null) {
            builder.queryParam("api_key", "{api_key}");
            variables.put("api_key", v3Key);
        }
        return builder.build(variables);
    }

    /** Paramètres triés (clé de cache stable) ; les valeurs nulles sont ignorées. */
    public static TreeMap<String, String> params(String... pairs) {
        var map = new TreeMap<String, String>();
        for (int i = 0; i + 1 < pairs.length; i += 2) {
            if (pairs[i + 1] != null) map.put(pairs[i], pairs[i + 1]);
        }
        return map;
    }
}
