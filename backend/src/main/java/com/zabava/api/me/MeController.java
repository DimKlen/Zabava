package com.zabava.api.me;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.zabava.api.auth.CurrentUser;
import com.zabava.api.catalog.dto.CatalogDtos.UserTitle;
import com.zabava.api.common.MediaType;
import com.zabava.api.me.dto.MeDtos.AddTitleRequest;
import com.zabava.api.me.dto.MeDtos.EpisodesRequest;
import com.zabava.api.me.dto.MeDtos.PatchTitleRequest;
import com.zabava.api.me.dto.MeDtos.Profile;
import com.zabava.api.me.dto.MeDtos.ProfileUpdate;
import com.zabava.api.me.dto.MeDtos.ProvidersUpdate;
import com.zabava.api.me.dto.MeDtos.PushTokenDeletion;
import com.zabava.api.me.dto.MeDtos.PushTokenRequest;
import com.zabava.api.me.dto.MeDtos.Upcoming;
import com.zabava.api.me.dto.MeDtos.WatchlistItem;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;

/** Données de l'utilisateur connecté (specs/docs/11 §3, routes /me). */
@RestController
@RequestMapping("/api/v1/me")
@Validated
public class MeController {

    private final ProfileService profiles;
    private final LibraryService library;
    private final WatchlistService watchlist;
    private final UpcomingService upcoming;

    public MeController(
            ProfileService profiles, LibraryService library, WatchlistService watchlist, UpcomingService upcoming) {
        this.profiles = profiles;
        this.library = library;
        this.watchlist = watchlist;
        this.upcoming = upcoming;
    }

    @GetMapping("/profile")
    public Profile profile(CurrentUser user) {
        return profiles.get(user.id());
    }

    @PutMapping("/profile")
    public Profile updateProfile(CurrentUser user, @Valid @RequestBody ProfileUpdate update) {
        return profiles.update(user.id(), update, user.avatarUrl());
    }

    @PutMapping("/providers")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setProviders(CurrentUser user, @Valid @RequestBody ProvidersUpdate update) {
        profiles.setProviders(user.id(), update.providerIds());
    }

    @GetMapping("/watchlist")
    public List<WatchlistItem> watchlist(
            CurrentUser user, @RequestParam @Pattern(regexp = "movie|tv|anime") String type) {
        return watchlist.list(profiles.prefs(user.id()), MediaType.parse(type));
    }

    @PostMapping("/titles")
    public ResponseEntity<UserTitle> addTitle(CurrentUser user, @Valid @RequestBody AddTitleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(library.add(profiles.prefs(user.id()), request));
    }

    @PatchMapping("/titles/{titleId}")
    public UserTitle patchTitle(
            CurrentUser user, @PathVariable String titleId, @Valid @RequestBody PatchTitleRequest request) {
        return library.patch(user.id(), titleId, request);
    }

    @DeleteMapping("/titles/{titleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeTitle(CurrentUser user, @PathVariable String titleId) {
        library.remove(user.id(), titleId);
    }

    @PostMapping("/episodes/watched")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markWatched(CurrentUser user, @Valid @RequestBody EpisodesRequest request) {
        library.markWatched(user.id(), request.episodeIds(), request.watchedAt());
    }

    @DeleteMapping("/episodes/watched")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unmarkWatched(CurrentUser user, @Valid @RequestBody EpisodesRequest request) {
        library.unmark(user.id(), request.episodeIds());
    }

    @GetMapping("/upcoming")
    public Upcoming upcoming(
            CurrentUser user,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "all") @Pattern(regexp = "all|movie|tv|anime") String type) {
        return upcoming.list(profiles.prefs(user.id()), from, to, type);
    }

    @PostMapping("/push-token")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void pushToken(CurrentUser user, @Valid @RequestBody PushTokenRequest request) {
        profiles.savePushToken(user.id(), request);
    }

    /** Déconnexion : l'appareil ne reçoit plus les notifications de ce compte. */
    @DeleteMapping("/push-token")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePushToken(CurrentUser user, @Valid @RequestBody PushTokenDeletion request) {
        profiles.deletePushToken(user.id(), request.expoToken());
    }

    /** Suppression du compte et de toutes ses données (obligatoire pour l'App Store). */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAccount(CurrentUser user) {
        profiles.deleteAccount(user.id());
    }
}
