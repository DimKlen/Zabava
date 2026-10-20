package com.zabava.api.me;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.zabava.api.catalog.TitleService;
import com.zabava.api.catalog.TitleStore;
import com.zabava.api.catalog.TitleStore.TitleRow;
import com.zabava.api.catalog.dto.CatalogDtos.Availability;
import com.zabava.api.common.MediaType;
import com.zabava.api.common.TitleRef;
import com.zabava.api.me.LibraryStore.UserTitleRow;
import com.zabava.api.me.ProfileService.Prefs;
import com.zabava.api.me.dto.MeDtos.WatchlistEpisode;
import com.zabava.api.me.dto.MeDtos.WatchlistItem;

/**
 * Ma liste (GET /me/watchlist). Les sections, tris et badges sont calculés côté client
 * à partir de ces données (specs/docs/06 › Données), ce qui permet le hors ligne.
 */
@Service
public class WatchlistService {

    private final LibraryStore library;
    private final TitleStore store;

    public WatchlistService(LibraryStore library, TitleStore store) {
        this.library = library;
        this.store = store;
    }

    public List<WatchlistItem> list(Prefs prefs, MediaType type) {
        Map<Long, UserTitleRow> userTitles = library.all(prefs.userId()).stream()
                .collect(Collectors.toMap(UserTitleRow::titleId, Function.identity()));
        List<TitleRow> titles = store.findByIds(userTitles.keySet()).stream()
                .filter(t -> t.type() == type)
                .toList();
        List<Long> ids = titles.stream().map(TitleRow::id).toList();

        Map<Long, Availability> offers = store.offers(ids);
        Map<Long, Map<String, LocalDate>> releases = store.releaseDates(ids, prefs.region());
        Map<Long, Instant> watched = type.isSeries() ? library.watched(prefs.userId(), ids) : Map.of();

        return titles.stream()
                .sorted((a, b) -> userTitles.get(b.id()).addedAt().compareTo(userTitles.get(a.id()).addedAt()))
                .map(t -> {
                    Map<String, LocalDate> dates = releases.getOrDefault(t.id(), Map.of());
                    return new WatchlistItem(
                            TitleRef.format(t.type(), t.tmdbId()),
                            t.tmdbId(),
                            t.type().key(),
                            t.title(),
                            t.year(),
                            t.posterPath(),
                            t.backdropPath(),
                            t.genres(),
                            t.runtime(),
                            t.imdbRating(),
                            t.imdbVotes(),
                            t.rtScore(),
                            dates.get("salle"),
                            dates.get("numerique"),
                            t.status(),
                            t.ended(),
                            t.network(),
                            offers.getOrDefault(t.id(), Availability.EMPTY),
                            TitleService.userTitle(t.type(), t.tmdbId(), userTitles.get(t.id())),
                            type.isSeries() ? episodes(t.id(), watched) : null);
                })
                .toList();
    }

    private List<WatchlistEpisode> episodes(long titleId, Map<Long, Instant> watched) {
        return store.episodes(titleId).stream()
                .map(e -> new WatchlistEpisode(
                        e.id(), e.season(), e.number(), e.name(), e.stillPath(), e.airDate(), e.airstamp(),
                        e.runtime(), watched.get(e.id())))
                .toList();
    }
}
