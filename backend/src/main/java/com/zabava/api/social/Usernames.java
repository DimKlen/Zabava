package com.zabava.api.social;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Règles des pseudos (specs/social/docs/01 §2), sans base. */
public final class Usernames {

    private Usernames() {}

    private static final Pattern FORMAT = Pattern.compile("^[a-z0-9._]{3,20}$");

    /** admin, zabava, support et les noms de routes de l'app. */
    static final Set<String> RESERVED = Set.of(
            "admin", "zabava", "support", "login", "search", "title", "person", "genre", "settings",
            "onboarding", "discover", "upcoming", "profile", "watchlist", "feed", "me", "u",
            "studio", "scan", "auth", "dev");

    /** Propositions fixes, essayées dans cet ordre avant {@code {base}{n}}. */
    private static final List<String> SUFFIXES = List.of(".tv", "_26", ".zab", "2", ".film");
    /** Base coupée pour laisser la place au suffixe (prototype : 15 caractères). */
    private static final int BASE_MAX = 15;

    public static boolean isWellFormed(String username) {
        return username != null && FORMAT.matcher(username).matches();
    }

    public static boolean isReserved(String username) {
        return RESERVED.contains(username);
    }

    /** Texte comparable sans accents ni casse (recherche de membres, filtres). */
    public static String normalize(String text) {
        if (text == null) return "";
        String stripped = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return stripped.toLowerCase(Locale.ROOT).trim();
    }

    /** Requête de recherche : sans « @ » initial, sans accents ni casse, espaces compris. */
    public static String searchQuery(String raw) {
        String text = raw == null ? "" : raw.trim();
        if (text.startsWith("@")) text = text.substring(1);
        return normalize(text);
    }

    /**
     * Candidats pour un pseudo pris, dans l'ordre : {@code {base}.tv}, {@code {base}_26}…,
     * puis {@code {base}3}, {@code {base}4}… ; seuls ceux au bon format et non réservés.
     */
    public static List<String> candidates(String username, int count) {
        String base = username == null ? "" : username.replaceAll("[._]+$", "");
        if (base.isEmpty()) base = "membre";
        if (base.length() > BASE_MAX) base = base.substring(0, BASE_MAX);
        List<String> result = new ArrayList<>();
        for (String suffix : SUFFIXES) {
            if (result.size() < count) add(result, base + suffix);
        }
        for (int n = 3; result.size() < count; n++) add(result, base + n);
        return result;
    }

    private static void add(List<String> result, String candidate) {
        if (isWellFormed(candidate) && !isReserved(candidate) && !result.contains(candidate)) result.add(candidate);
    }
}
