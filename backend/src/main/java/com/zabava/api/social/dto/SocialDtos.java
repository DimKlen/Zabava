package com.zabava.api.social.dto;

import java.time.Instant;
import java.util.List;

import com.zabava.api.catalog.dto.CatalogDtos.TitleLite;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

/** Objets des endpoints sociaux (specs/social/docs/06 §3). */
public final class SocialDtos {

    private SocialDtos() {}

    /** Une page de résultats ; {@code nextCursor} absent sur la dernière. */
    public record Page<T>(List<T> items, String nextCursor) {}

    /**
     * Membre vu par l'utilisateur connecté. {@code followState} : {@code following} (amis),
     * {@code pending} (ma demande d'ami envoyée), {@code requested} (sa demande reçue),
     * {@code none}, ou {@code blocked} si je l'ai bloqué.
     */
    public record MemberLite(
            String username,
            String displayName,
            String avatarUrl,
            String followState,
            boolean followsMe,
            int commonCount) {}

    public record UserProfile(
            String username,
            String displayName,
            String avatarUrl,
            String followState,
            boolean followsMe,
            int commonCount,
            int friendsCount,
            boolean canSeeLists,
            boolean isMe) {}

    /** {@code reason} : invalid, reserved ou taken ; {@code suggestions} : jusqu'à 3 pseudos libres. */
    public record UsernameAvailability(boolean available, String reason, List<String> suggestions) {}

    public record EpisodeCode(int season, int number) {}

    /** Titre d'une liste de profil. {@code status} : towatch, watched, in_progress ou finished. */
    public record ProfileTitle(
            TitleLite title, String status, EpisodeCode lastEpisode, Integer progressPct, boolean inMyList) {}

    public record ActivityEpisode(long id, int season, int number, String name, String stillPath) {}

    /**
     * Élément du fil. {@code createdAt} : moment affiché (dernière mise à jour de l'activité).
     * Le titre et la vignette d'épisode sont toujours envoyés : l'anti-spoiler est appliqué par l'app.
     */
    public record Activity(
            String id,
            Instant createdAt,
            MemberLite actor,
            String type,
            TitleLite title,
            ActivityEpisode episode,
            int count,
            MemberLite target,
            boolean inMyList) {}

    /**
     * Un de mes amis qui a ce titre. {@code status} : film watched / towatch ; série
     * in_progress (avec {@code detail} « S02 E05 »), finished, abandoned, towatch.
     * {@code date} : date de visionnage d'un film vu, sinon dernière action sur le titre.
     */
    public record FollowingStatus(MemberLite user, String status, String detail, Instant date) {}

    /** {@code following} : mes amis qui ont ce titre. */
    public record TitleSocial(List<FollowingStatus> following) {}

    public record FollowResult(String status) {}

    public record AcceptAllResult(int accepted) {}

    public record ReportRequest(@NotNull @Pattern(regexp = "inappropriate|impersonation|spam") String reason) {}
}
