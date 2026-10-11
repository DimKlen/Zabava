package com.zabava.api.tvmaze;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import com.zabava.api.common.Json;
import com.zabava.api.config.AppProperties;
import com.zabava.api.config.CacheConfig;

import tools.jackson.databind.JsonNode;

/** Heures de diffusion exactes (TVmaze, correspondance par identifiant IMDb). */
@Component
public class TvmazeClient {

    private final RestClient http;

    public TvmazeClient(AppProperties props, JdkClientHttpRequestFactory requestFactory) {
        this.http = RestClient.builder().baseUrl(props.tvmaze().baseUrl()).requestFactory(requestFactory).build();
    }

    /** Identifiant TVmaze d'une série, ou vide si elle est inconnue. */
    @Cacheable(cacheNames = CacheConfig.TVMAZE, key = "'lookup:' + #imdbId")
    public Optional<Integer> lookupByImdb(String imdbId) {
        try {
            JsonNode show = http.get()
                    .uri(b -> b.path("/lookup/shows").queryParam("imdb", imdbId).build())
                    .retrieve()
                    .body(JsonNode.class);
            return Optional.ofNullable(show == null ? null : Json.integer(show, "id"));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    /** Heure de diffusion (UTC) de chaque épisode, par clé {@code "saison:numéro"}. */
    @Cacheable(cacheNames = CacheConfig.TVMAZE, key = "'episodes:' + #showId")
    public Map<String, Instant> airstamps(int showId) {
        JsonNode episodes = http.get()
                .uri(b -> b.path("/shows/{id}/episodes").queryParam("specials", "1").build(showId))
                .retrieve()
                .body(JsonNode.class);
        Map<String, Instant> result = new HashMap<>();
        if (episodes == null) return result;
        for (JsonNode ep : episodes.values()) {
            Integer season = Json.integer(ep, "season");
            Integer number = Json.integer(ep, "number");
            String airstamp = Json.text(ep, "airstamp");
            if (season != null && number != null && airstamp != null) {
                result.put(season + ":" + number, Instant.parse(airstamp));
            }
        }
        return result;
    }
}
