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

    /** {@code followRequests} : demandes d'ami reçues et acceptées (notifications sociales). */
    public record NotificationPrefs(
            boolean episodes,
            boolean cinema,
            boolean streaming,
            boolean seasons,
            int digestHour,
            boolean followRequests) {}

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
            List<Integer> providerIds,
            String username,
            int friendsCount,
            int followRequestsCount) {}

    /**
     * Champs absents = inchangés. Valeurs permises : specs/docs/05 et 09. Le nom et la photo sont
     * ceux du compte Google ou Apple ; le pseudo ne se choisit qu'à l'inscription.
     */
    public record ProfileUpdate(
            @Pattern(regexp = "CA|FR|BE|CH|US") String region,
            @Pattern(regexp = "fr-CA|fr-FR|en-CA|en-US") String language,
            Boolean spoilerProtection,
            @Valid NotificationPrefsUpdate notificationPrefs,
            Instant onboardedAt,
            String username) {}

    public record NotificationPrefsUpdate(
            Boolean episodes,
            Boolean cinema,
            Boolean streaming,
            Boolean seasons,
            @Min(0) @Max(23) Integer digestHour,
            Boolean followRequests) {}

    public record ProvidersUpdate(@NotNull @Size(max = 50) List<Integer> providerIds) {}

    public record PushTokenDeletion(@NotBlank @Size(max = 200) String expoToken) {}

    public record PushTokenRequest(
            @NotBlank @Size(max = 200) String expoToken,
            @NotBlank @Pattern(regexp = "ios|android") String platform,
            @Size(max = 64) String timezone) {}

    /**
     * Ajout d'un titre. Les trois derniers champs sont facultatifs : « Annuler » après un
     * retrait les renvoie pour remettre le titre exactement comme avant.
     */
    public record AddTitleRequest(
            @NotNull Integer tmdbId,
            @NotBlank @Pattern(regexp = "movie|tv|anime") String type,
            @NotBlank @Pattern(regexp = "towatch|watched|following|abandoned") String status,
            Instant addedAt,
            Instant watchedAt,
            Boolean notificationsEnabled,
            @Valid Review review) {}

    public record PatchTitleRequest(
            @Pattern(regexp = "towatch|watched|following|abandoned") String status,
            Instant watchedAt,
            Boolean notificationsEnabled,
            @Valid Review review) {}

    /**
     * Ma note d'un film. Présente : remplace la note et le commentaire (absents = effacés) ;
     * absente de la requête : inchangés. Un commentaire vide compte comme absent.
     */
    public record Review(@Min(1) @Max(10) Integer rating, @Size(max = 1000) String comment) {}

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
            /** Ma région, sinon la plus proche dans le temps ailleurs. */
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
