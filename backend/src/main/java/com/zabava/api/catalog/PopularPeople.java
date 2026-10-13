package com.zabava.api.catalog;

import java.text.Normalizer;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import com.zabava.api.catalog.dto.CatalogDtos.PersonLite;
import com.zabava.api.common.Json;
import com.zabava.api.tmdb.TmdbClient;

import tools.jackson.databind.JsonNode;

/**
 * Index en mémoire des personnes les plus populaires de TMDB, cherchées par début de mot.
 *
 * <p>La recherche TMDB ne trouve que des mots entiers : « zen » renvoie des « Zen » obscurs et
 * jamais Zendaya (specs/etapes/07, critère d'acceptation). Cet index complète donc les résultats
 * de personnes : chargé au démarrage, puis rechargé en arrière-plan toutes les 24 h.
 */
@Component
public class PopularPeople {

    private static final Logger log = LoggerFactory.getLogger(PopularPeople.class);
    private static final Duration TTL = Duration.ofHours(24);
    /** En dessous, un préfixe trouve trop de monde pour être utile. */
    static final int MIN_QUERY_LENGTH = 2;

    record Entry(PersonLite person, double popularity, List<String> words) {}

    private final TmdbClient tmdb;
    private final Clock clock;
    private final int pages;
    private final AtomicBoolean loading = new AtomicBoolean();
    private volatile List<Entry> entries = List.of();
    private volatile Instant loadedAt = Instant.MIN;

    public PopularPeople(TmdbClient tmdb, Clock clock, @Value("${zabava.popular-people-pages:50}") int pages) {
        this.tmdb = tmdb;
        this.clock = clock;
        this.pages = pages;
    }

    @EventListener(ApplicationReadyEvent.class)
    void loadAtStartup() {
        refreshInBackground();
    }

    /** Personnes dont un mot du nom commence par la requête, les plus populaires d'abord. */
    public List<PersonLite> matching(String query) {
        if (clock.instant().isAfter(loadedAt.plus(TTL))) refreshInBackground();
        String q = normalize(query);
        if (q.length() < MIN_QUERY_LENGTH) return List.of();
        List<String> queryWords = words(q);
        return entries.stream()
                .filter(e -> matches(e.words(), q, queryWords))
                .map(Entry::person)
                .toList();
    }

    /**
     * « zen » : un mot qui commence par zen. « tom ha » : chaque mot de la requête
     * commence un mot du nom (Tom Hanks), dans l'ordre.
     */
    private static boolean matches(List<String> nameWords, String query, List<String> queryWords) {
        if (String.join(" ", nameWords).startsWith(query)) return true;
        int from = 0;
        for (String word : queryWords) {
            int found = -1;
            for (int i = from; i < nameWords.size(); i++) {
                if (nameWords.get(i).startsWith(word)) {
                    found = i;
                    break;
                }
            }
            if (found < 0) return false;
            from = found + 1;
        }
        return true;
    }

    private void refreshInBackground() {
        if (pages <= 0 || !loading.compareAndSet(false, true)) return;
        Thread.ofVirtual().name("popular-people").start(() -> {
            try {
                refresh();
            } finally {
                loading.set(false);
            }
        });
    }

    void refresh() {
        load(pages);
    }

    /** Recharge l'index avec {@code pageCount} pages TMDB ; garde l'ancien si TMDB ne répond pas. */
    void load(int pageCount) {
        Map<Integer, Entry> byId = new LinkedHashMap<>();
        try {
            for (int page = 1; page <= pageCount; page++) {
                JsonNode body = tmdb.get("/person/popular", TmdbClient.params(
                        "language", "fr-CA",
                        "page", String.valueOf(page)));
                for (JsonNode node : Json.array(body, "results")) {
                    if (Json.bool(node, "adult")) continue;
                    PersonLite person = TmdbMapper.person(node);
                    if (person.name() == null) continue;
                    double popularity = node.path("popularity").asDouble(0);
                    byId.putIfAbsent(person.id(), new Entry(person, popularity, words(normalize(person.name()))));
                }
            }
        } catch (RuntimeException e) {
            log.warn("Index des personnes populaires non rechargé : {}", e.getMessage());
            return;
        }
        List<Entry> sorted = new ArrayList<>(byId.values());
        sorted.sort(Comparator.comparingDouble(Entry::popularity).reversed());
        entries = List.copyOf(sorted);
        loadedAt = clock.instant();
    }

    /** Minuscules sans accents : « Zoë » et « zoe » se valent. */
    static String normalize(String value) {
        String decomposed = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD);
        return decomposed.replaceAll("\\p{M}", "").toLowerCase(Locale.ROOT).trim();
    }

    private static List<String> words(String normalized) {
        return List.of(normalized.split("[^\\p{L}\\p{N}]+")).stream().filter(w -> !w.isEmpty()).toList();
    }
}
