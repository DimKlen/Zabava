package com.zabava.api.catalog;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;

/**
 * Recherche tolérante aux fautes. TMDB exige que chaque mot corresponde : « le diable tous le temps »
 * ne trouve rien. On relance donc quelques variantes de la requête, puis on ne garde que les titres
 * proches de ce qui a été tapé.
 */
final class FuzzySearch {

    /** Score minimal (0 à 1) d'un titre trouvé par une variante. */
    static final double MIN_SCORE = 0.8;
    static final int MAX_VARIANTS = 8;
    private static final int MAX_WORDS = 6;
    /** Le dernier mot est raccourci à 60 % : TMDB le complète comme un début de mot. */
    private static final int MIN_PREFIX = 4;

    private FuzzySearch() {}

    /**
     * Variantes, des plus sûres aux plus larges : un mot en moins (faute sur ce mot), le dernier mot
     * raccourci (faute en fin de mot), deux mots collés (« inter stellar »).
     */
    static List<String> variants(String query) {
        List<String> words = words(query);
        if (words.isEmpty() || words.size() > MAX_WORDS) return List.of();
        Set<String> variants = new LinkedHashSet<>();
        if (words.size() >= 2) {
            for (int i = 0; i < words.size(); i++) {
                List<String> rest = new ArrayList<>(words);
                rest.remove(i);
                variants.add(String.join(" ", rest));
            }
        }
        String last = words.getLast();
        int prefix = Math.max(MIN_PREFIX, (int) Math.ceil(last.length() * 0.6));
        if (last.length() > prefix) {
            List<String> shortened = new ArrayList<>(words.subList(0, words.size() - 1));
            shortened.add(last.substring(0, prefix));
            variants.add(String.join(" ", shortened));
        }
        for (int i = 0; i + 1 < words.size(); i++) {
            List<String> joined = new ArrayList<>(words.subList(0, i));
            joined.add(words.get(i) + words.get(i + 1));
            joined.addAll(words.subList(i + 2, words.size()));
            variants.add(String.join(" ", joined));
        }
        variants.remove(String.join(" ", words));
        return variants.stream().filter(v -> !v.isBlank()).limit(MAX_VARIANTS).toList();
    }

    /** Proximité entre la requête et le titre (ou le titre original), de 0 à 1. */
    static double score(String query, TitleLite title) {
        return Math.max(score(query, title.title()), score(query, title.originalTitle()));
    }

    static double score(String query, String candidate) {
        List<String> wanted = words(query);
        List<String> found = words(candidate);
        if (wanted.isEmpty() || found.isEmpty()) return 0;
        // Chaque mot tapé contre le mot le plus proche du titre, pondéré par sa longueur : rater
        // « diable » pèse plus que rater « le »…
        double sum = 0;
        int weight = 0;
        for (String word : wanted) {
            double best = 0;
            for (String other : found) best = Math.max(best, wordSimilarity(word, other));
            sum += best * word.length();
            weight += word.length();
        }
        // … ou les deux en entier sans espaces (« inter stellar » contre « Interstellar »).
        double whole = similarity(String.join("", wanted), String.join("", found));
        return Math.max(sum / weight, whole);
    }

    /** Un début de mot vaut le mot entier (« thron » pour « thrones »). */
    private static double wordSimilarity(String typed, String word) {
        if (typed.length() >= 3 && word.startsWith(typed)) return 1;
        return similarity(typed, word);
    }

    private static double similarity(String a, String b) {
        int longest = Math.max(a.length(), b.length());
        return longest == 0 ? 1 : 1 - (double) levenshtein(a, b) / longest;
    }

    private static int levenshtein(String a, String b) {
        int[] previous = new int[b.length() + 1];
        int[] current = new int[b.length() + 1];
        for (int j = 0; j <= b.length(); j++) previous[j] = j;
        for (int i = 1; i <= a.length(); i++) {
            current[0] = i;
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                current[j] = Math.min(Math.min(current[j - 1] + 1, previous[j] + 1), previous[j - 1] + cost);
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        return previous[b.length()];
    }

    /** Mots en minuscules, sans accents ni ponctuation : « L'Odyssée » → [l, odyssee]. */
    static List<String> words(String text) {
        String normalized = PopularPeople.normalize(text);
        return List.of(normalized.split("[^\\p{L}\\p{N}]+")).stream().filter(w -> !w.isEmpty()).toList();
    }
}
