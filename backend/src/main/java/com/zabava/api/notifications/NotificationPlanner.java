package com.zabava.api.notifications;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.zabava.api.me.dto.MeDtos.NotificationPrefs;

/**
 * Règles des notifications (specs/docs/01 §7), sans base ni réseau : à partir des
 * candidats d'un utilisateur, décide quoi envoyer maintenant.
 */
public final class NotificationPlanner {

    private NotificationPlanner() {}

    /** Type enregistré dans {@code notifications_log.type}. Ordre = priorité pour un même titre. */
    public enum Type {
        EPISODE("episode"),
        SEASON("season"),
        CINEMA("cinema"),
        STREAMING("streaming");

        public final String key;

        Type(String key) {
            this.key = key;
        }
    }

    /** À partir de 4 épisodes le même jour, une seule notification groupée. */
    static final int GROUP_FROM = 4;
    /** « Disponible en streaming » part entre 9 h et 21 h. */
    static final int STREAMING_FROM_HOUR = 9;
    static final int STREAMING_UNTIL_HOUR = 21;
    /** Au-delà, un événement manqué (serveur arrêté…) n'est plus annoncé. */
    static final Duration STALE_AFTER = Duration.ofHours(24);
    static final String UPCOMING_URL = "zabava://upcoming";

    /** Clé de dédoublonnage (index unique de notifications_log). */
    public record LogKey(Type type, long titleId, Long episodeId) {}

    /**
     * Événement susceptible d'être annoncé. {@code dueAt} : moment prévu dans le fuseau de
     * l'utilisateur (heure de diffusion, ou heure du récapitulatif).
     */
    public record Candidate(Type type, long titleId, Long episodeId, String text, String url, ZonedDateTime dueAt) {
        LogKey key() {
            return new LogKey(type, titleId, episodeId);
        }
    }

    /** Notification à envoyer ; {@code keys} sont journalisées pour ne jamais la renvoyer. */
    public record Planned(String text, String url, List<LogKey> keys) {}

    public static List<Planned> plan(
            List<Candidate> candidates,
            NotificationPrefs prefs,
            ZonedDateTime now,
            Set<Long> titlesNotifiedToday,
            Set<LogKey> alreadySent) {
        List<Candidate> due = candidates.stream()
                .filter(c -> enabled(c.type(), prefs))
                .filter(c -> !alreadySent.contains(c.key()))
                .filter(c -> !c.dueAt().isAfter(now) && c.dueAt().isAfter(now.minus(STALE_AFTER)))
                .filter(c -> c.type() != Type.STREAMING
                        || (now.getHour() >= STREAMING_FROM_HOUR && now.getHour() < STREAMING_UNTIL_HOUR))
                .filter(c -> !titlesNotifiedToday.contains(c.titleId()))
                .sorted(Comparator.comparing(Candidate::type).thenComparing(Candidate::dueAt))
                .toList();

        List<Planned> planned = new ArrayList<>();
        List<Candidate> episodes = due.stream().filter(c -> c.type() == Type.EPISODE).toList();
        boolean grouped = episodes.size() >= GROUP_FROM;
        if (grouped) {
            planned.add(new Planned(
                    episodes.size() + " nouveaux épisodes aujourd'hui",
                    UPCOMING_URL,
                    episodes.stream().map(Candidate::key).toList()));
        }

        // Une notification par titre et par jour : la plus prioritaire.
        Map<Long, List<Candidate>> byTitle = new LinkedHashMap<>();
        for (Candidate c : due) byTitle.computeIfAbsent(c.titleId(), id -> new ArrayList<>()).add(c);
        for (List<Candidate> ofTitle : byTitle.values()) {
            Candidate first = ofTitle.getFirst();
            if (first.type() == Type.EPISODE && grouped) continue;
            // Les autres épisodes du même titre ne partiront pas plus tard.
            List<LogKey> keys = ofTitle.stream()
                    .filter(c -> c.type() == first.type())
                    .map(Candidate::key)
                    .toList();
            planned.add(new Planned(first.text(), first.url(), first.type() == Type.EPISODE ? keys : List.of(first.key())));
        }
        return planned;
    }

    private static boolean enabled(Type type, NotificationPrefs prefs) {
        return switch (type) {
            case EPISODE -> prefs.episodes();
            case SEASON -> prefs.seasons();
            case CINEMA -> prefs.cinema();
            case STREAMING -> prefs.streaming();
        };
    }
}
