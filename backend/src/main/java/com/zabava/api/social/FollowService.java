package com.zabava.api.social;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zabava.api.common.ApiException;
import com.zabava.api.social.SocialStore.ProfileRow;
import com.zabava.api.social.dto.SocialDtos.FollowResult;

/**
 * Suivi à sens unique, instantané (retours du 2026-11-01, à la place des amis réciproques) : suivre
 * quelqu'un crée tout de suite un abonnement {@code accepted}, sans demande ni confirmation ni
 * notification. On ne sait pas qui nous suit. Aussi : signalement (docs/01 §6).
 */
@Service
public class FollowService {

    /** Limite anti-abus : nouveaux suivis par jour UTC. */
    static final int DAILY_LIMIT = 200;
    /**
     * Délai pendant lequel « Annuler » rétablit un suivi retiré tel qu'il était (même date), sans
     * compter dans la limite du jour.
     */
    static final Duration RESTORE_WINDOW = Duration.ofMinutes(10);

    private record Removal(Instant createdAt, Instant acceptedAt) {}

    private final JdbcClient db;
    private final SocialStore store;
    private final Clock clock;

    public FollowService(JdbcClient db, SocialStore store, Clock clock) {
        this.db = db;
        this.store = store;
        this.clock = clock;
    }

    // ─── Suivi ────────────────────────────────────────────────────────────────

    /** « Suivre » : effectif tout de suite. Idempotent : déjà suivi, rien ne change. */
    @Transactional
    public FollowResult follow(UUID me, String username) {
        ProfileRow target = other(me, username);
        if (store.relation(me, target.id()).following()) return new FollowResult("accepted");
        // « Annuler » après « Ne plus suivre » : le suivi revient tel qu'il était.
        Optional<Removal> removed = takeRemoval(me, target.id());
        if (removed.isPresent()) {
            insert(me, target.id(), removed.get().createdAt(), removed.get().acceptedAt());
        } else {
            Instant now = clock.instant();
            consumeQuota(me, now);
            insert(me, target.id(), now, now);
        }
        return new FollowResult("accepted");
    }

    /** « Ne plus suivre » : sans prévenir. */
    @Transactional
    public void unfollow(UUID me, String username) {
        ProfileRow target = other(me, username);
        db.sql("""
                with removed as (
                  delete from follows where follower_id = :f and followee_id = :e returning *
                )
                insert into follow_removals (follower_id, followee_id, removed_by, created_at, accepted_at, removed_at)
                select follower_id, followee_id, :f, created_at, accepted_at, :now from removed
                where status = 'accepted'
                on conflict (follower_id, followee_id) do update set removed_by = excluded.removed_by,
                  created_at = excluded.created_at, accepted_at = excluded.accepted_at, removed_at = excluded.removed_at
                """)
                .param("f", me)
                .param("e", target.id())
                .param("now", Timestamp.from(clock.instant()))
                .update();
    }

    // ─── Signalement ──────────────────────────────────────────────────────────

    /** Une fois par motif et par profil (signaler à nouveau ne fait rien). */
    public void report(UUID me, String username, String reason) {
        ProfileRow target = other(me, username);
        db.sql("""
                insert into reports (reporter_id, reported_id, reason) values (:me, :target, :reason)
                on conflict do nothing
                """)
                .param("me", me)
                .param("target", target.id())
                .param("reason", reason)
                .update();
    }

    // ─── Détail ───────────────────────────────────────────────────────────────

    /** Profil d'un autre ; introuvable s'il n'existe pas. */
    ProfileRow other(UUID me, String username) {
        ProfileRow target = store.findByUsername(username)
                .orElseThrow(() -> ApiException.notFound("Profil introuvable"));
        if (target.id().equals(me)) throw ApiException.badRequest("Action impossible sur son propre profil");
        return target;
    }

    private void insert(UUID follower, UUID followee, Instant createdAt, Instant acceptedAt) {
        db.sql("""
                insert into follows (follower_id, followee_id, status, created_at, accepted_at)
                values (:f, :e, 'accepted', :created, :accepted)
                on conflict do nothing
                """)
                .param("f", follower)
                .param("e", followee)
                .param("created", Timestamp.from(createdAt))
                .param("accepted", Timestamp.from(acceptedAt))
                .update();
    }

    /** Suivi retiré récemment par {@code follower}, consommé. */
    private Optional<Removal> takeRemoval(UUID follower, UUID followee) {
        return db.sql("""
                delete from follow_removals
                where follower_id = :f and followee_id = :e and removed_by = :f and removed_at > :since
                  and accepted_at is not null
                returning created_at, accepted_at
                """)
                .param("f", follower)
                .param("e", followee)
                .param("since", Timestamp.from(clock.instant().minus(RESTORE_WINDOW)))
                .query((rs, n) -> new Removal(
                        rs.getTimestamp("created_at").toInstant(), SocialStore.instant(rs.getTimestamp("accepted_at"))))
                .optional();
    }

    /** Compte une nouvelle demande du jour ; au-delà de la limite, {@code 429}. */
    private void consumeQuota(UUID me, Instant now) {
        Integer count = db.sql("""
                insert into follow_quota (user_id, day, count) values (:me, :day, 1)
                on conflict (user_id, day) do update set count = follow_quota.count + 1
                where follow_quota.count < :limit
                returning count
                """)
                .param("me", me)
                .param("day", LocalDate.ofInstant(now, ZoneOffset.UTC))
                .param("limit", DAILY_LIMIT)
                .query(Integer.class)
                .optional()
                .orElse(null);
        if (count == null) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "follow_limit",
                    "Tu as atteint la limite de 200 suivis par jour");
        }
    }
}
