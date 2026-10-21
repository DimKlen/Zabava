package com.zabava.api.catalog.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Objets du catalogue renvoyés à l'app (modèle client de specs/docs/10 §1).
 * Les identifiants de titre sont de la forme {@code "{type}-{tmdbId}"}.
 */
public final class CatalogDtos {

    private CatalogDtos() {}

    /**
     * Titre résumé : résultats de recherche, listes, carrousels. {@code badge} n'est rempli que
     * par GET /discover (affiches de Découvrir, du genre et de la recherche avancée).
     */
    public record TitleLite(
            String id,
            int tmdbId,
            String type,
            String title,
            String originalTitle,
            Integer year,
            String posterPath,
            String backdropPath,
            String overview,
            LocalDate releaseDate,
            Double popularity,
            Double voteAverage,
            TitleBadge badge) {

        public TitleLite withBadge(TitleBadge value) {
            return new TitleLite(id, tmdbId, type, title, originalTitle, year, posterPath, backdropPath,
                    overview, releaseDate, popularity, voteAverage, value);
        }
    }

    public record PersonLite(int id, String name, String profilePath, List<String> knownFor) {}

    /** {@code countries} : pays (ISO 3166-1) où la plateforme propose le titre ; vide pour une simple plateforme. */
    public record Provider(int id, String name, String shortName, String logoPath, String link, List<String> countries) {}

    /** Offres de tous les pays suivis : abonnement, location, achat (JustWatch via TMDB). */
    public record Availability(List<Provider> sub, List<Provider> rent, List<Provider> buy, String link) {
        public static final Availability EMPTY = new Availability(List.of(), List.of(), List.of(), null);
    }

    public record SeasonSummary(int number, String name, Integer episodeCount, LocalDate airDate) {}

    public record CastMember(int id, String name, String character, String profilePath) {}

    /** Équipe (film : réalisation, scénario) ou créateurs (série : création, diffusion). */
    public record Crew(
            List<String> directors,
            List<Integer> directorIds,
            List<String> writers,
            List<Integer> writerIds,
            List<String> creators,
            List<Integer> creatorIds,
            List<String> networks) {}

    /** Société de production (pour un animé : le studio d'animation). */
    public record Studio(int id, String name) {}

    public record Collection(int id, String name, List<TitleLite> parts) {}

    public record UserTitle(
            String titleId, String status, Instant addedAt, Instant watchedAt, boolean notificationsEnabled) {}

    /** Fiche complète (GET /titles/{type}/{tmdbId}). */
    public record TitleDetail(
            String id,
            int tmdbId,
            String type,
            String title,
            String originalTitle,
            Integer year,
            String posterPath,
            String backdropPath,
            List<String> genres,
            String certification,
            Integer runtime,
            Double imdbRating,
            Integer imdbVotes,
            Integer rtScore,
            String overview,
            String originalLanguage,
            String country,
            String studio,
            List<Studio> studios,
            LocalDate releaseTheatrical,
            LocalDate releaseDigital,
            Integer collectionId,
            String status,
            String network,
            Boolean ended,
            List<SeasonSummary> seasons,
            Availability availability,
            String trailerKey,
            List<CastMember> cast,
            Crew crew,
            Collection collection,
            List<TitleLite> similar,
            UserTitle userTitle) {}

    public record Episode(
            long id,
            int season,
            int number,
            String name,
            String overview,
            String stillPath,
            LocalDate airDate,
            Instant airstamp,
            Integer runtime,
            Double imdbRating,
            Instant watchedAt) {}

    /** Saison avec ses épisodes et la date de visionnage de chacun (GET /titles/tv/{id}/seasons/{n}). */
    public record SeasonDetail(int number, String name, Integer episodeCount, LocalDate airDate, List<Episode> episodes) {}

    public record PersonDetail(
            int id,
            String name,
            String profilePath,
            Integer gender,
            LocalDate birthday,
            String placeOfBirth,
            String biography,
            List<TitleLite> credits,
            List<Role> roles) {}

    /** Rôle marquant d'une personne (biographie générée quand TMDB n'en a pas). */
    public record Role(String title, String character) {}

    public record SearchResult(List<PersonLite> people, List<TitleLite> titles, int page, int totalPages) {}

    public record DiscoverResult(List<TitleLite> results, int total, int page) {}

    public record Count(int total) {}

    /**
     * Ce qui manque à un {@link TitleLite} pour le badge de son affiche (specs/docs/01 §5) :
     * sortie en salle dans la région, offres, chaîne d'origine et fin de production des séries.
     */
    public record TitleBadge(
            String id, LocalDate releaseTheatrical, Availability availability, String network, Boolean ended) {}
}
