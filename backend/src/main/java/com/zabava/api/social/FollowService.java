package com.zabava.api.social;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zabava.api.common.ApiException;
import com.zabava.api.notifications.SocialNotifications;
import com.zabava.api.social.SocialStore.ProfileRow;
import com.zabava.api.social.SocialStore.Relation;
import com.zabava.api.social.dto.SocialDtos.FollowResult;
import com.zabava.api.social.dto.SocialDtos.MemberLite;
import com.zabava.api.social.dto.SocialDtos.Page;

/**
 * Amis réciproques (retours du 2026-10-24, à la place du suivi de specs/social/docs/01 §4) : une
 * demande est un abonnement {@code pending} ; acceptée, elle devient une amitié, soit deux
 * abonnements {@code accepted}, un dans chaque sens. Aussi : signalement (docs/01 §6).
 */
@Service
public class FollowService {

    /** Limite anti-abus : demandes d'ami par jour UTC. */
    static final int DAILY_LIMIT = 200;
    /**
     * Délai pendant lequel « Annuler » rétablit une amitié retirée telle qu'elle était (mêmes
     * dates), sans compter dans la limite du jour.
     */
    static final Duration RESTORE_WINDOW = Duration.ofMinutes(10);
    private static final int REQUESTS_PAGE = 50;

    private record Removal(Instant createdAt, Instant acceptedAt) {}

    private final JdbcClient db;
    private final SocialStore store;
    private final Members members;
    private final SocialNotifications notifications;
    private final Clock clock;

    public FollowService(JdbcClient db, SocialStore store, Members members, SocialNotifications notifications,
            Clock clock) {
        this.db = db;
        this.store = store;
        this.members = members;
        this.notifications = notifications;
        this.clock = clock;
    }

    // ─── Amis ────────────────────────────────────────────────────────────────

    /**
     * « Ajouter en ami » : envoie une demande ; si l'autre m'en a déjà envoyé une, nous voilà amis.
     * Idempotent : renvoie l'état actuel si nous sommes déjà amis ou si ma demande est envoyée.
     */
    @Transactional
    public FollowResult follow(UUID me, String username) {
        ProfileRow target = other(me, username);
        Relation relation = store.relation(me, target.id());
        if (relation.myStatus() != null) return new FollowResult(relation.myStatus());
        if ("pending".equals(statusOf(target.id(), me))) {
            acceptFrom(List.of(target.id()), me);
            return new FollowResult("accepted");
        }
        // « Annuler » après « Retirer de mes amis » : l'amitié revient telle qu'elle était.
        Optional<Removal> mine = takeRemoval(me, target.id(), me);
        Optional<Removal> theirs = takeRemoval(target.id(), me, me);
        if (mine.isPresent() && theirs.isPresent()) {
            insert(me, target.id(), "accepted", mine.get().createdAt(), mine.get().acceptedAt());
            insert(target.id(), me, "accepted", theirs.get().createdAt(), theirs.get().acceptedAt());
            return new FollowResult("accepted");
        }
        Instant now = clock.instant();
        consumeQuota(me, now);
        insert(me, target.id(), "pending", now, null);
        notifications.followRequest(me, target.id());
        return new FollowResult("pending");
    }

    /** Retirer de mes amis (les deux sens, sans prévenir), ou annuler ma demande. */
    @Transactional
    public void unfollow(UUID me, String username) {
        ProfileRow target = other(me, username);
        removeFollow(me, target.id(), me);
        // Sa demande reçue, elle, reste : seule une amitié se retire dans les deux sens.
        if ("accepted".equals(statusOf(target.id(), me))) removeFollow(target.id(), me, me);
    }

    // ─── Demandes ─────────────────────────────────────────────────────────────

    public Page<MemberLite> requests(UUID me, String cursor) {
        int offset = Cursors.offset(cursor);
        List<UUID> ids = db.sql("""
                select f.follower_id from follows f
                where f.followee_id = :me and f.status = 'pending'
                order by f.created_at desc, f.follower_id
                limit :limit offset :offset
                """)
                .param("me", me)
                .param("limit", REQUESTS_PAGE + 1)
                .param("offset", offset)
                .query(UUID.class)
                .list();
        return page(me, ids, offset, REQUESTS_PAGE);
    }

    @Transactional
    public void accept(UUID me, String username) {
        ProfileRow follower = other(me, username);
        if ("pending".equals(statusOf(follower.id(), me))) acceptFrom(List.of(follower.id()), me);
    }

    @Transactional
    public void decline(UUID me, String username) {
        ProfileRow follower = other(me, username);
        db.sql("delete from follows where follower_id = :f and followee_id = :me and status = 'pending'")
                .param("f", follower.id())
                .param("me", me)
                .update();
    }

    /** Accepte toutes mes demandes d'ami. Renvoie leur nombre. */
    @Transactional
    public int acceptAll(UUID me) {
        List<UUID> pending = db.sql("select follower_id from follows where followee_id = :me and status = 'pending'")
                .param("me", me)
                .query(UUID.class)
                .list();
        acceptFrom(pending, me);
        return pending.size();
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

    private String statusOf(UUID follower, UUID followee) {
        return db.sql("select status from follows where follower_id = :f and followee_id = :e")
                .param("f", follower)
                .param("e", followee)
                .query(String.class)
                .optional()
                .orElse(null);
    }

    private void insert(UUID follower, UUID followee, String status, Instant createdAt, Instant acceptedAt) {
        db.sql("""
                insert into follows (follower_id, followee_id, status, created_at, accepted_at)
                values (:f, :e, :status, :created, :accepted)
                on conflict do nothing
                """)
                .param("f", follower)
                .param("e", followee)
                .param("status", status)
                .param("created", Timestamp.from(createdAt))
                .param("accepted", acceptedAt == null ? null : Timestamp.from(acceptedAt))
                .update();
    }

    /** Supprime l'abonnement ; s'il était accepté (amitié), le garde de côté pour « Annuler ». */
    private void removeFollow(UUID follower, UUID followee, UUID removedBy) {
        db.sql("""
                with removed as (
                  delete from follows where follower_id = :f and followee_id = :e returning *
                )
                insert into follow_removals (follower_id, followee_id, removed_by, created_at, accepted_at, removed_at)
                select follower_id, followee_id, :by, created_at, accepted_at, :now from removed
                where status = 'accepted'
                on conflict (follower_id, followee_id) do update set removed_by = excluded.removed_by,
                  created_at = excluded.created_at, accepted_at = excluded.accepted_at, removed_at = excluded.removed_at
                """)
                .param("f", follower)
                .param("e", followee)
                .param("by", removedBy)
                .param("now", Timestamp.from(clock.instant()))
                .update();
    }

    /** Abonnement accepté retiré récemment par {@code removedBy}, consommé. */
    private Optional<Removal> takeRemoval(UUID follower, UUID followee, UUID removedBy) {
        return db.sql("""
                delete from follow_removals
                where follower_id = :f and followee_id = :e and removed_by = :by and removed_at > :since
                  and accepted_at is not null
                returning created_at, accepted_at
                """)
                .param("f", follower)
                .param("e", followee)
                .param("by", removedBy)
                .param("since", Timestamp.from(clock.instant().minus(RESTORE_WINDOW)))
                .query((rs, n) -> new Removal(
                        rs.getTimestamp("created_at").toInstant(), SocialStore.instant(rs.getTimestamp("accepted_at"))))
                .optional();
    }

    private void acceptFrom(List<UUID> followers, UUID me) {
        if (followers.isEmpty()) return;
        Instant now = clock.instant();
        db.sql("""
                update follows set status = 'accepted', accepted_at = :now
                where followee_id = :me and status = 'pending' and follower_id in (:ids)
                """)
                .param("now", Timestamp.from(now))
                .param("me", me)
                .param("ids", followers)
                .update();
        // L'amitié dans l'autre sens ; ma propre demande en attente, s'il y en a une, est acceptée.
        db.sql("""
                insert into follows (follower_id, followee_id, status, created_at, accepted_at)
                select :me, id, 'accepted', :now, :now from unnest(cast(:ids as uuid[])) as id
                on conflict (follower_id, followee_id) do update set status = 'accepted', accepted_at = :now
                where follows.status = 'pending'
                """)
                .param("me", me)
                .param("now", Timestamp.from(now))
                .param("ids", followers.toArray(UUID[]::new))
                .update();
        followers.forEach(follower -> notifications.followAccepted(follower, me));
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
                    "Tu as atteint la limite de 200 demandes d'ami par jour");
        }
    }

    private Page<MemberLite> page(UUID me, List<UUID> ids, int offset, int size) {
        boolean more = ids.size() > size;
        List<UUID> shown = more ? ids.subList(0, size) : ids;
        return new Page<>(members.of(me, shown), more ? Cursors.offset(offset + size) : null);
    }
}
