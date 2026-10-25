package com.zabava.api.me;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zabava.api.catalog.TitleService;
import com.zabava.api.catalog.TitleStore;
import com.zabava.api.catalog.TitleStore.EpisodeRow;
import com.zabava.api.catalog.TitleStore.TitleRow;
import com.zabava.api.catalog.dto.CatalogDtos.UserTitle;
import com.zabava.api.common.ApiException;
import com.zabava.api.common.MediaType;
import com.zabava.api.common.TitleRef;
import com.zabava.api.me.LibraryStore.UserTitleRow;
import com.zabava.api.me.ProfileService.Prefs;
import com.zabava.api.me.dto.MeDtos.AddTitleRequest;
import com.zabava.api.me.dto.MeDtos.PatchTitleRequest;
import com.zabava.api.me.dto.MeDtos.Review;
import com.zabava.api.social.ActivityService;

/** Ajout, statut, retrait d'un titre et cochage des épisodes (specs/docs/01 §3–4). */
@Service
public class LibraryService {

    private static final Set<String> MOVIE_STATUSES = Set.of("towatch", "watched");
    private static final Set<String> SERIES_STATUSES = Set.of("following", "abandoned");

    private final TitleService titles;
    private final TitleStore store;
    private final LibraryStore library;
    private final ActivityService activities;
    private final Clock clock;

    public LibraryService(
            TitleService titles, TitleStore store, LibraryStore library, ActivityService activities, Clock clock) {
        this.titles = titles;
        this.store = store;
        this.library = library;
        this.activities = activities;
        this.clock = clock;
    }

    /**
     * Crée le titre en base s'il n'existe pas ; « Marquer comme vu » sur un film hors liste l'ajoute en Vu.
     * Pas de transaction englobante : les appels TMDB ne doivent pas retenir une connexion à la base.
     */
    public UserTitle add(Prefs prefs, AddTitleRequest request) {
        MediaType type = MediaType.parse(request.type());
        checkStatus(type, request.status());
        TitleRow row = titles.ensure(new TitleRef(type, request.tmdbId()), prefs, type.isSeries());
        Instant now = clock.instant();
        Instant watchedAt = "watched".equals(request.status()) ? notAfter(request.watchedAt(), now) : null;
        library.upsert(
                prefs.userId(),
                row.id(),
                request.status(),
                watchedAt,
                request.addedAt() == null ? null : notAfter(request.addedAt(), now),
                request.notificationsEnabled());
        review(prefs.userId(), row, request.review());
        activities.syncTitle(prefs.userId(), row.id());
        return current(prefs.userId(), row);
    }

    @Transactional
    public UserTitle patch(UUID userId, String titleId, PatchTitleRequest request) {
        TitleRow row = row(titleId);
        UserTitleRow existing = library.find(userId, row.id())
                .orElseThrow(() -> ApiException.notFound("Titre absent de la liste"));
        Instant watchedAt = null;
        if (request.status() != null) {
            checkStatus(row.type(), request.status());
            // « Marquer comme non vu » remet le film en À voir, sans date.
            if ("watched".equals(request.status())) {
                watchedAt = request.watchedAt() != null ? request.watchedAt()
                        : existing.watchedAt() != null ? existing.watchedAt() : clock.instant();
            }
        }
        library.update(userId, row.id(), request.status(), watchedAt, request.notificationsEnabled());
        review(userId, row, request.review());
        if (request.status() != null) activities.syncTitle(userId, row.id());
        return current(userId, row);
    }

    @Transactional
    public void remove(UUID userId, String titleId) {
        long id = row(titleId).id();
        library.delete(userId, id);
        activities.syncTitle(userId, id);
    }

    /**
     * Coche des épisodes (idempotent). Une série hors liste est ajoutée en « following ».
     * Les épisodes spéciaux comptent comme les autres ici : c'est le client qui les exclut des calculs.
     */
    @Transactional
    public void markWatched(UUID userId, List<Long> episodeIds, Instant watchedAt) {
        List<EpisodeRow> episodes = existing(episodeIds);
        episodes.stream().map(EpisodeRow::titleId).distinct().forEach(t -> library.followIfAbsent(userId, t));
        library.markWatched(userId, episodeIds, watchedAt != null ? watchedAt : clock.instant());
        activities.syncTitles(userId, episodes.stream().map(EpisodeRow::titleId).toList());
    }

    @Transactional
    public void unmark(UUID userId, List<Long> episodeIds) {
        List<EpisodeRow> episodes = existing(episodeIds);
        library.unmark(userId, episodeIds);
        activities.syncTitles(userId, episodes.stream().map(EpisodeRow::titleId).toList());
    }

    private List<EpisodeRow> existing(List<Long> episodeIds) {
        List<Long> distinct = episodeIds.stream().distinct().toList();
        List<EpisodeRow> episodes = store.episodesByIds(distinct);
        if (episodes.size() != distinct.size()) throw ApiException.notFound("Épisode introuvable");
        return episodes;
    }

    /** Note et commentaire : films seulement ; un commentaire vide est effacé. */
    private void review(UUID userId, TitleRow row, Review review) {
        if (review == null) return;
        if (row.type().isSeries()) throw ApiException.badRequest("Seul un film peut être noté");
        String comment = review.comment() == null || review.comment().isBlank() ? null : review.comment().strip();
        library.review(userId, row.id(), review.rating(), comment);
    }

    private TitleRow row(String titleId) {
        TitleRef ref = TitleRef.parse(titleId);
        return store.find(ref.type().tmdbType(), ref.tmdbId())
                .orElseThrow(() -> ApiException.notFound("Titre introuvable"));
    }

    private UserTitle current(UUID userId, TitleRow row) {
        UserTitleRow userTitle = library.find(userId, row.id()).orElseThrow();
        return TitleService.userTitle(row.type(), row.tmdbId(), userTitle);
    }

    /** Date fournie par l'app, bornée à maintenant ; absente → maintenant. */
    private static Instant notAfter(Instant requested, Instant now) {
        return requested == null || requested.isAfter(now) ? now : requested;
    }

    private static void checkStatus(MediaType type, String status) {
        Set<String> allowed = type.isSeries() ? SERIES_STATUSES : MOVIE_STATUSES;
        if (!allowed.contains(status)) {
            throw ApiException.badRequest("Statut « " + status + " » impossible pour le type " + type.key());
        }
    }
}
