package com.zabava.api.me;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.zabava.api.catalog.TitleStore;
import com.zabava.api.catalog.TitleStore.Arrival;
import com.zabava.api.catalog.TitleStore.EpisodeRow;
import com.zabava.api.catalog.TitleStore.TitleRow;
import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;
import com.zabava.api.common.ApiException;
import com.zabava.api.common.MediaType;
import com.zabava.api.common.TitleRef;
import com.zabava.api.me.LibraryStore.UserTitleRow;
import com.zabava.api.me.ProfileService.Prefs;
import com.zabava.api.me.dto.MeDtos.NoDateItem;
import com.zabava.api.me.dto.MeDtos.Upcoming;
import com.zabava.api.me.dto.MeDtos.UpcomingEvent;

/**
 * À venir (GET /me/upcoming) : épisodes des séries suivies, sorties en salle, numériques et
 * arrivées en streaming des films À voir (specs/docs/09 §9.1). Les dates sont celles du
 * fuseau de l'utilisateur.
 */
@Service
public class UpcomingService {

    /** La spec affiche 90 jours ; on tolère un peu plus pour les changements de fuseau. */
    private static final long MAX_RANGE_DAYS = 120;

    private final LibraryStore library;
    private final TitleStore store;
    private final Clock clock;

    public UpcomingService(LibraryStore library, TitleStore store, Clock clock) {
        this.library = library;
        this.store = store;
        this.clock = clock;
    }

    public Upcoming list(Prefs prefs, LocalDate from, LocalDate to, String type) {
        if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw ApiException.badRequest("Période invalide");
        }
        ZoneId zone = prefs.timezone();
        Map<Long, UserTitleRow> userTitles = library.all(prefs.userId()).stream()
                .collect(Collectors.toMap(UserTitleRow::titleId, Function.identity()));
        Map<Long, TitleRow> titles = store.findByIds(userTitles.keySet()).stream()
                .filter(t -> "all".equals(type) || t.type().key().equals(type))
                .collect(Collectors.toMap(TitleRow::id, Function.identity()));

        List<UpcomingEvent> events = new ArrayList<>();
        List<NoDateItem> noDate = new ArrayList<>();

        // Films : seulement ceux de la liste au statut À voir.
        List<Long> movies = titles.values().stream()
                .filter(t -> t.type() == MediaType.MOVIE && "towatch".equals(userTitles.get(t.id()).status()))
                .map(TitleRow::id)
                .toList();
        store.releaseDates(movies, prefs.region()).forEach((titleId, dates) -> dates.forEach((kind, date) -> {
            String event = switch (kind) {
                case "salle" -> "theatrical";
                case "numerique" -> "digital";
                default -> null;
            };
            if (event != null && inRange(date, from, to)) {
                events.add(new UpcomingEvent(date, event, lite(titles.get(titleId)), null, null, null, null));
            }
        }));
        Instant start = from.atStartOfDay(zone).toInstant();
        Instant end = to.plusDays(1).atStartOfDay(zone).toInstant();
        for (Arrival arrival : store.subscriptionArrivals(movies, prefs.region(), start, end)) {
            events.add(new UpcomingEvent(
                    arrival.firstSeen().atZone(zone).toLocalDate(), "streaming", lite(titles.get(arrival.titleId())),
                    null, null, null, arrival.providerName()));
        }

        // Séries et animés : seulement les titres suivis (pas abandonnés), épisodes non vus.
        List<TitleRow> series = titles.values().stream()
                .filter(t -> t.type().isSeries() && "following".equals(userTitles.get(t.id()).status()))
                .toList();
        Map<Long, Instant> watched = library.watched(prefs.userId(), series.stream().map(TitleRow::id).toList());
        LocalDate today = LocalDate.now(clock.withZone(zone));
        for (TitleRow title : series) {
            List<EpisodeRow> episodes = store.episodes(title.id()).stream().filter(e -> e.season() > 0).toList();
            boolean hasFutureDate = false;
            for (EpisodeRow e : episodes) {
                LocalDate date = localDate(e, zone);
                if (date == null) continue;
                if (!date.isBefore(today)) hasFutureDate = true;
                if (watched.containsKey(e.id()) || !inRange(date, from, to)) continue;
                if (e.airstamp() != null && e.airstamp().isBefore(clock.instant())) continue;
                events.add(new UpcomingEvent(
                        date, "episode", lite(title), e.season(), e.number(), e.airstamp(), title.network()));
            }
            // Série en production sans épisode daté : « Saison {n+1} annoncée, date à venir ».
            if (!hasFutureDate && !Boolean.TRUE.equals(title.ended())) {
                int lastSeason = episodes.stream().mapToInt(EpisodeRow::season).max().orElse(0);
                noDate.add(new NoDateItem(lite(title), lastSeason + 1));
            }
        }

        // Ordre dans un jour : par heure, puis par titre.
        events.sort(Comparator.comparing(UpcomingEvent::date)
                .thenComparing(UpcomingEvent::airstamp, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(e -> e.title().title(), Comparator.nullsLast(Comparator.naturalOrder())));
        return new Upcoming(events, noDate);
    }

    /** Date locale de diffusion : l'heure exacte TVmaze si connue, sinon la date TMDB. */
    private static LocalDate localDate(EpisodeRow e, ZoneId zone) {
        if (e.airstamp() != null) return e.airstamp().atZone(zone).toLocalDate();
        return e.airDate();
    }

    private static boolean inRange(LocalDate date, LocalDate from, LocalDate to) {
        return !date.isBefore(from) && !date.isAfter(to);
    }

    static TitleLite lite(TitleRow t) {
        return new TitleLite(
                TitleRef.format(t.type(), t.tmdbId()),
                t.tmdbId(),
                t.type().key(),
                t.title(),
                t.originalTitle(),
                t.year(),
                t.posterPath(),
                t.backdropPath(),
                t.overview(),
                null,
                null,
                null,
                null);
    }
}
