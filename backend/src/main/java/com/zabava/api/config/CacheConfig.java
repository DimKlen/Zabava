package com.zabava.api.config;

import java.time.Duration;

import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

/** Caches mémoire des sources (durées de specs/docs/11 §1 et docs/10 §3). */
@Configuration
public class CacheConfig {

    public static final String TMDB = "tmdb";
    public static final String TMDB_SEARCH = "tmdb-search";
    public static final String OMDB = "omdb";
    public static final String TVMAZE = "tvmaze";

    @Bean
    CacheManager cacheManager() {
        var manager = new CaffeineCacheManager();
        manager.registerCustomCache(TMDB, spec(Duration.ofHours(24), 20_000));
        manager.registerCustomCache(TMDB_SEARCH, spec(Duration.ofMinutes(10), 5_000));
        manager.registerCustomCache(OMDB, spec(Duration.ofDays(7), 20_000));
        manager.registerCustomCache(TVMAZE, spec(Duration.ofHours(24), 5_000));
        return manager;
    }

    private static com.github.benmanes.caffeine.cache.Cache<Object, Object> spec(Duration ttl, long max) {
        return Caffeine.newBuilder().expireAfterWrite(ttl).maximumSize(max).build();
    }
}
