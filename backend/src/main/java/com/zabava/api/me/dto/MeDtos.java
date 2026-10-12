package com.zabava.api.me.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import com.zabava.api.catalog.dto.CatalogDtos.Availability;
import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;
import com.zabava.api.catalog.dto.CatalogDtos.UserTitle;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Objets des endpoints {@code /me} (specs/docs/11 §3). */
public final class MeDtos {

    private MeDtos() {}

    public record NotificationPrefs(
            boolean episodes, boolean cinema, boolean streaming, boolean seasons, int digestHour) {}

    public record Profile(
            String id,
            String displayName,
            String avatarUrl,
            String email,
            String authProvider,
            String region,
            String language,
            boolean spoilerProtection,
            NotificationPrefs notificationPrefs,
            String timezone,
            Instant onboardedAt,
            List<Integer> providerIds) {}

    /** Champs absents = inchangés. Valeurs permises : specs/docs/05 et 09. */
    public record ProfileUpdate(
            @Pattern(regexp = "CA|FR|BE|CH|US") String region,
            @Pattern(regexp = "fr-CA|fr-FR|en-CA|en-US") String language,
            Boolean spoilerProtection,
            @Valid NotificationPrefsUpdate notificationPrefs,
            Instant onboardedAt) {}

    public record NotificationPrefsUpdate(
            Boolean episodes,
            Boolean cinema,
            Boolean streaming,
            Boolean seasons,
            @Min(0) @Max(23) Integer digestHour) {}

    public record ProvidersUpdate(@NotNull @Size(max = 50) List<Integer> providerIds) {}

    public record PushTokenRequest(
            @NotBlank String expoToken, @NotBlank @Pattern(regexp = "ios|android") String platform, String timezone) {}

    public record AddTitleRequest(
            @NotNull Integer tmdbId,
            @NotBlank @Pattern(regexp = "movie|tv|anime") String type,
            @NotBlank @Pattern(regexp = "towatch|watched|following|abandoned") String status) {}

    public record PatchTitleRequest(
            @Pattern(regexp = "towatch|watched|following|abandoned") String status,
            Instant watchedAt,
            Boolean notificationsEnabled) {}

    public record EpisodesRequest(@NotEmpty @Size(max = 2000) List<Long> episodeIds, Instant watchedAt) {}

    public record WatchlistEpisode(
            long id,
            int season,
            int number,
            String name,
            String stillPath,
            LocalDate airDate,
            Instant airstamp,
            Integer runtime,
            Instant watchedAt) {}

    /** Un titre de Ma liste, avec ce qu'il faut pour calculer sections et badges côté client. */
    public record WatchlistItem(
            String id,
            int tmdbId,
            String type,
            String title,
            Integer year,
            String posterPath,
            String backdropPath,
            List<String> genres,
            Integer runtime,
            Double imdbRating,
            Integer imdbVotes,
            Integer rtScore,
            LocalDate releaseTheatrical,
            LocalDate releaseDigital,
            String status,
            Boolean ended,
            String network,
            Availability availability,
            UserTitle userTitle,
            List<WatchlistEpisode> episodes) {}

    public record UpcomingEvent(
            LocalDate date,
            String kind,
            TitleLite title,
            Integer season,
            Integer episode,
            Instant airstamp,
            String provider) {}

    /** Série suivie en production sans épisode daté : « Saison {nextSeason} annoncée, date à venir ». */
    public record NoDateItem(TitleLite title, int nextSeason) {}

    public record Upcoming(List<UpcomingEvent> events, List<NoDateItem> noDate) {}
}
