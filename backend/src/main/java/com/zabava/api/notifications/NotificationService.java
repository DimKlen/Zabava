package com.zabava.api.notifications;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.zabava.api.catalog.TitleStore;
import com.zabava.api.catalog.TitleStore.Arrival;
import com.zabava.api.catalog.TitleStore.EpisodeRow;
import com.zabava.api.me.LibraryStore;
import com.zabava.api.me.ProfileService;
import com.zabava.api.me.dto.MeDtos.NotificationPrefs;
import com.zabava.api.me.dto.MeDtos.Profile;
import com.zabava.api.notifications.ExpoPushClient.PushMessage;
import com.zabava.api.notifications.NotificationPlanner.Candidate;
import com.zabava.api.notifications.NotificationPlanner.Planned;
import com.zabava.api.notifications.NotificationPlanner.Type;
import com.zabava.api.notifications.NotificationStore.Recipient;
import com.zabava.api.notifications.NotificationStore.WatchedTitle;

/**
 * Notifications dues (specs/docs/01 §7, docs/11 §4) : calcule les candidats de chaque
 * utilisateur, applique les règles ({@link NotificationPlanner}), journalise puis envoie.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final ZoneId DEFAULT_ZONE = ZoneId.of("America/Toronto");
    private static final DateTimeFormatter SHORT_DAY = DateTimeFormatter.ofPattern("d MMM", Locale.CANADA_FRENCH);
    /** Arrivées en streaming détectées depuis moins de 24 h. */
    private static final Duration ARRIVAL_WINDOW = Duration.ofHours(24);

    private final NotificationStore store;
    private final TitleStore titles;
    private final LibraryStore library;
    private final ProfileService profiles;
    private final ExpoPushClient expo;
    private final Clock clock;

    public NotificationService(NotificationStore store, TitleStore titles, LibraryStore library,
            ProfileService profiles, ExpoPushClient expo, Clock clock) {
        this.store = store;
        this.titles = titles;
        this.library = library;
        this.profiles = profiles;
        this.expo = expo;
        this.clock = clock;
    }

    /** Une passe complète (toutes les 15 min) ; renvoie le nombre de messages envoyés. */
    public int dispatch() {
        List<PushMessage> messages = new ArrayList<>();
        for (Recipient recipient : store.recipients()) {
            try {
                for (Planned planned : due(recipient.userId())) {
                    // Journal d'abord : un envoi concurrent ou un nouvel essai ne doublonne jamais.
                    if (!store.log(recipient.userId(), planned.keys())) continue;
                    recipient.tokens().forEach(t -> messages.add(new PushMessage(t, planned.text(), planned.url())));
                }
            } catch (RuntimeException e) {
                log.warn("Notifications non calculées pour {}", recipient.userId(), e);
            }
        }
        if (messages.isEmpty()) return 0;
        store.deleteTokens(expo.send(messages));
        return messages.size();
    }

    /** Notifications à envoyer maintenant pour un utilisateur. */
    List<Planned> due(UUID userId) {
        Profile profile = profiles.get(userId);
        ZoneId zone = zone(profile.timezone());
        ZonedDateTime now = ZonedDateTime.now(clock.withZone(zone));
        NotificationPrefs prefs = profile.notificationPrefs();

        List<WatchedTitle> watched = store.alertedTitles(userId);
        List<Candidate> candidates = new ArrayList<>();
        candidates.addAll(movieCandidates(watched, profile, now));
        candidates.addAll(seriesCandidates(userId, watched, prefs.digestHour(), now));

        Set<Long> ids = watched.stream().map(WatchedTitle::titleId).collect(Collectors.toSet());
        Instant startOfDay = now.toLocalDate().atStartOfDay(zone).toInstant();
        return NotificationPlanner.plan(
                candidates, prefs, now, store.titlesNotifiedSince(userId, startOfDay), store.sentKeys(userId, ids));
    }

    // ─── Films ────────────────────────────────────────────────────────────────

    private List<Candidate> movieCandidates(List<WatchedTitle> watched, Profile profile, ZonedDateTime now) {
        String region = profile.region();
        LocalDate today = now.toLocalDate();
        ZonedDateTime digest = today.atTime(profile.notificationPrefs().digestHour(), 0).atZone(now.getZone());
        ZonedDateTime morning = today.atTime(NotificationPlanner.STREAMING_FROM_HOUR, 0).atZone(now.getZone());
        List<WatchedTitle> movies = watched.stream().filter(t -> "movie".equals(t.mediaType())).toList();
        Map<Long, WatchedTitle> byId = movies.stream().collect(Collectors.toMap(WatchedTitle::titleId, t -> t));

        List<Candidate> out = new ArrayList<>();
        for (WatchedTitle movie : movies) {
            String url = "zabava://title/movie/" + movie.tmdbId();
            if (today.equals(store.releaseDate(movie.titleId(), region, "salle"))) {
                out.add(new Candidate(Type.CINEMA, movie.titleId(), null,
                        movie.title() + " sort au cinéma aujourd'hui", url, digest));
            }
            if (today.equals(store.releaseDate(movie.titleId(), region, "numerique"))) {
                out.add(new Candidate(Type.STREAMING, movie.titleId(), null,
                        movie.title() + " est maintenant disponible en numérique", url, morning));
            }
        }
        // Arrivée en abonnement : chez mes plateformes si j'en ai choisi, sinon toute plateforme.
        List<Integer> mine = profile.providerIds();
        Instant end = now.toInstant().plusSeconds(1);
        for (Arrival a : titles.subscriptionArrivals(byId.keySet(), region, end.minus(ARRIVAL_WINDOW), end)) {
            if (!mine.isEmpty() && !mine.contains(a.providerId())) continue;
            WatchedTitle movie = byId.get(a.titleId());
            out.add(new Candidate(Type.STREAMING, movie.titleId(), null,
                    movie.title() + " est maintenant sur " + a.providerName(),
                    "zabava://title/movie/" + movie.tmdbId(),
                    a.firstSeen().atZone(now.getZone())));
        }
        return out;
    }

    // ─── Séries ───────────────────────────────────────────────────────────────

    private List<Candidate> seriesCandidates(UUID userId, List<WatchedTitle> watched, int digestHour, ZonedDateTime now) {
        List<WatchedTitle> series = watched.stream().filter(t -> "tv".equals(t.mediaType())).toList();
        Set<Long> seen = new HashSet<>(library.watched(userId, series.stream().map(WatchedTitle::titleId).toList()).keySet());
        LocalDate today = now.toLocalDate();
        ZonedDateTime digest = today.atTime(digestHour, 0).atZone(now.getZone());

        List<Candidate> out = new ArrayList<>();
        for (WatchedTitle show : series) {
            String type = show.anime() ? "anime" : "tv";
            String base = "zabava://title/" + type + "/" + show.tmdbId() + "?tab=episodes&season=";
            List<EpisodeRow> episodes = titles.episodes(show.titleId()).stream().filter(e -> e.season() > 0).toList();

            // Nouvel épisode : à l'heure de diffusion, sinon à l'heure du récapitulatif.
            for (EpisodeRow e : episodes) {
                if (seen.contains(e.id())) continue;
                ZonedDateTime dueAt = dueAt(e, digestHour, now.getZone());
                if (dueAt == null) continue;
                out.add(new Candidate(Type.EPISODE, show.titleId(), e.id(),
                        show.title() + " · " + code(e) + " est disponible",
                        base + e.season() + "&episode=" + e.number(), dueAt));
            }

            // Nouvelle saison : série à jour (tous les épisodes diffusés vus) et 1er épisode daté à venir.
            List<EpisodeRow> aired = episodes.stream().filter(e -> aired(e, now)).toList();
            boolean upToDate = !aired.isEmpty() && aired.stream().allMatch(e -> seen.contains(e.id()));
            if (!upToDate) continue;
            int lastAiredSeason = aired.stream().mapToInt(EpisodeRow::season).max().orElse(0);
            for (EpisodeRow e : episodes) {
                LocalDate start = localDate(e, now.getZone());
                if (e.number() != 1 || e.season() <= lastAiredSeason || start == null || start.isBefore(today)) continue;
                String when = start.equals(today) ? "aujourd'hui" : "le " + SHORT_DAY.format(start);
                out.add(new Candidate(Type.SEASON, show.titleId(), e.id(),
                        "La saison " + e.season() + " de " + show.title() + " commence " + when,
                        base + e.season(), digest));
            }
        }
        return out;
    }

    private static ZonedDateTime dueAt(EpisodeRow e, int digestHour, ZoneId zone) {
        if (e.airstamp() != null) return e.airstamp().atZone(zone);
        if (e.airDate() != null) return e.airDate().atTime(digestHour, 0).atZone(zone);
        return null;
    }

    private static boolean aired(EpisodeRow e, ZonedDateTime now) {
        if (e.airstamp() != null) return !e.airstamp().isAfter(now.toInstant());
        return e.airDate() != null && !e.airDate().isAfter(now.toLocalDate());
    }

    private static LocalDate localDate(EpisodeRow e, ZoneId zone) {
        if (e.airstamp() != null) return e.airstamp().atZone(zone).toLocalDate();
        return e.airDate();
    }

    /** « S04 E03 ». */
    static String code(EpisodeRow e) {
        return String.format("S%02d E%02d", e.season(), e.number());
    }

    private static ZoneId zone(String timezone) {
        try {
            return timezone == null ? DEFAULT_ZONE : ZoneId.of(timezone);
        } catch (RuntimeException e) {
            return DEFAULT_ZONE;
        }
    }
}
