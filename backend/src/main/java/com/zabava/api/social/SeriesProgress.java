package com.zabava.api.social;

import java.time.Instant;

/**
 * Avancement d'un utilisateur dans une série, épisodes spéciaux (saison 0) exclus.
 * Même règle que {@code seriesSection} de l'app (mobile/src/domain/series.ts) : le serveur en a
 * besoin pour les listes des autres, « a terminé » et « Ils l'ont vu ».
 *
 * @param aired épisodes diffusés
 * @param airedWatched épisodes diffusés et vus
 * @param watched épisodes vus, diffusés ou non
 */
public record SeriesProgress(
        String status,
        Boolean ended,
        int aired,
        int airedWatched,
        int watched,
        Instant firstWatchedAt,
        Instant lastWatchedAt,
        Integer lastSeason,
        Integer lastNumber) {

    /** abandoned, towatch (pas commencée), in_progress (à regarder ou à jour) ou finished. */
    public String bucket() {
        if ("abandoned".equals(status)) return "abandoned";
        if (airedWatched == 0) return "towatch";
        if (airedWatched < aired) return "in_progress";
        return Boolean.TRUE.equals(ended) ? "finished" : "in_progress";
    }

    /** round(vus / diffusés × 100), comme la barre de progression de l'app. */
    public int progressPct() {
        return Math.round(airedWatched * 100f / Math.max(1, aired));
    }

    /** Code du dernier épisode vu, ex. « S02 E05 », ou null. */
    public String lastCode() {
        if (lastSeason == null || lastNumber == null) return null;
        return "S%02d E%02d".formatted(lastSeason, lastNumber);
    }

    /** Fin de série : terminée et tous ses épisodes diffusés vus. */
    public boolean finished() {
        return "finished".equals(bucket());
    }
}
