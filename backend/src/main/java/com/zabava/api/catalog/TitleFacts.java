package com.zabava.api.catalog;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.Semaphore;
import java.util.function.Function;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.zabava.api.catalog.dto.CatalogDtos.TitleBadge;
import com.zabava.api.common.Json;
import com.zabava.api.common.MediaType;
import com.zabava.api.common.TitleRef;
import com.zabava.api.tmdb.TmdbClient;

import tools.jackson.databind.JsonNode;

/**
 * Faits d'un titre que les listes TMDB ne donnent pas : plateformes, sortie en salle, chaîne,
 * saisons. Sert aux badges des affiches (specs/docs/01 §5) et aux listes de Découvrir qui
 * dépendent des saisons. Les fiches sont lues sans langue : la clé de cache est partagée par
 * tous les utilisateurs.
 */
@Service
public class TitleFacts {

    private static final Logger log = LoggerFactory.getLogger(TitleFacts.class);
    /** Appels TMDB simultanés (limite d'environ 40 requêtes par seconde). */
    private static final int PARALLEL = 8;

    private final TmdbClient tmdb;

    public TitleFacts(TmdbClient tmdb) {
        this.tmdb = tmdb;
    }

    /** Fiche TMDB réduite : dates de sortie et offres (film), offres, chaîne et saisons (série). */
    public JsonNode facts(MediaType type, int tmdbId) {
        boolean movie = type == MediaType.MOVIE;
        return tmdb.get("/" + type.tmdbType() + "/" + tmdbId, TmdbClient.params(
                "append_to_response", movie ? "release_dates,watch/providers" : "watch/providers"));
    }

    /** Données de badge de chaque titre ; un titre introuvable est omis. */
    public List<TitleBadge> badges(List<TitleRef> refs, String region) {
        return parallel(refs, ref -> {
            JsonNode d = facts(ref.type(), ref.tmdbId());
            boolean movie = ref.type() == MediaType.MOVIE;
            Map<String, LocalDate> releases = movie
                    ? TitleService.releaseDates(d).getOrDefault(region, Map.of())
                    : Map.of();
            return new TitleBadge(
                    ref.toString(),
                    releases.get("salle"),
                    TitleService.availability(d, region),
                    movie ? null : TitleService.network(d),
                    movie ? null : TitleService.isEnded(Json.text(d, "status")));
        });
    }

    /** Applique {@code task} en parallèle, dans l'ordre ; un échec donne une valeur absente. */
    public <T, R> List<R> parallel(List<T> items, Function<T, R> task) {
        Semaphore permits = new Semaphore(PARALLEL);
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            List<Future<R>> futures = new ArrayList<>();
            for (T item : items) {
                futures.add(executor.submit(() -> {
                    permits.acquire();
                    try {
                        return task.apply(item);
                    } finally {
                        permits.release();
                    }
                }));
            }
            List<R> results = new ArrayList<>();
            for (Future<R> future : futures) {
                try {
                    results.add(future.get());
                } catch (ExecutionException e) {
                    log.debug("Fiche TMDB indisponible : {}", e.getCause().getMessage());
                    results.add(null);
                }
            }
            return results.stream().filter(Objects::nonNull).toList();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return List.of();
        }
    }
}
