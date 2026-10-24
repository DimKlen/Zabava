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
 * Suivre, se désabonner, retirer un abonné, demandes, blocage et signalement
 * (specs/social/docs/01 §4–6, docs/06 §4).
 */
@Service
public class FollowService {

    /** Limite anti-abus : nouveaux abonnements (et demandes) par jour UTC. */
    static final int DAILY_LIMIT = 200;
    /**
     * Délai pendant lequel « Annuler » rétablit un abonnement retiré tel qu'il était (mêmes
     * dates, accepté même si le profil est privé), sans compter dans la limite du jour.
     */
    static final Duration RESTORE_WINDOW = Duration.ofMinutes(10);
    private static final int REQUESTS_PAGE = 50;

    private record Removal(Instant createdAt, Instant acceptedAt) {}

    private final JdbcClient db;
    private final SocialStore store;
    private final Members members;
    private final ActivityService activities;
    private final SocialNotifications notifications;
    private final Clock clock;

    public FollowService(JdbcClient db, SocialStore store, Members members, ActivityService activities,
            SocialNotifications notifications, Clock clock) {
        this.db = db;
        this.store = store;
        this.members = members;
        this.activities = activities;
        this.notifications = notifications;
        this.clock = clock;
    }

    // ─── Suivre ───────────────────────────────────────────────────────────────

    /** Idempotent : renvoie l'état actuel si j'ai déjà un abonnement ou une demande. */
    @Transactional
    public FollowResult follow(UUID me, String username) {
        ProfileRow target = other(me, username);
        Relation relation = store.relation(me, target.id());
        if (relation.blockedEitherWay()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "blocked", "Impossible de suivre ce profil");
        }
        if (relation.myStatus() != null) return new FollowResult(relation.myStatus());

        Instant now = clock.instant();
        Optional<Removal> removal = takeRemoval(me, target.id(), me);
        if (removal.isPresent() && removal.get().acceptedAt() != null) {
            insert(me, target.id(), "accepted", removal.get().createdAt(), removal.get().acceptedAt());
            return new FollowResult("accepted");
        }
        consumeQuota(me, now);
        String status = target.isPrivate() ? "pending" : "accepted";
        insert(me, target.id(), status, now, "accepted".equals(status) ? now : null);
        // « Annuler » un désabonnement (ci-dessus) ne prévient personne ; un vrai abonnement, si.
        if ("accepted".equals(status)) notifications.newFollower(me, target.id());
        else notifications.followRequest(me, target.id());
        return new FollowResult(status);
    }

    /** Se désabonner ou annuler une demande. */
    @Transactional
    public void unfollow(UUID me, String username) {
        ProfileRow target = other(me, username);
        removeFollow(me, target.id(), me);
    }

    /** Retirer un de mes abonnés, sans le prévenir. */
    @Transactional
    public void removeFollower(UUID me, String username) {
        ProfileRow follower = other(me, username);
        String status = statusOf(follower.id(), me);
        if ("accepted".equals(status)) removeFollow(follower.id(), me, me);
    }

    /** « Annuler » après avoir retiré un abonné : l'abonnement revient tel qu'il était. */
    @Transactional
    public void restoreFollower(UUID me, String username) {
        ProfileRow follower = other(me, username);
        if (store.relation(me, follower.id()).blockedEitherWay() || statusOf(follower.id(), me) != null) return;
        Removal removal = takeRemoval(follower.id(), me, me)
                .filter(r -> r.acceptedAt() != null)
                .orElseThrow(() -> ApiException.notFound("Aucun abonné à rétablir"));
        insert(follower.id(), me, "accepted", removal.createdAt(), removal.acceptedAt());
    }

    // ─── Demandes ─────────────────────────────────────────────────────────────

    public Page<MemberLite> requests(UUID me, String cursor) {
        int offset = Cursors.offset(cursor);
        List<UUID> ids = db.sql("""
                select f.follower_id from follows f
                where f.followee_id = :me and f.status = 'pending' and %s
                order by f.created_at desc, f.follower_id
                limit :limit offset :offset
                """.formatted(SocialStore.notBlocked("f.follower_id")))
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

    /** Accepte toutes mes demandes (aussi au passage de privé à public). Renvoie leur nombre. */
    @Transactional
    public int acceptAll(UUID me) {
        List<UUID> pending = db.sql("select follower_id from follows where followee_id = :me and status = 'pending'")
                .param("me", me)
                .query(UUID.class)
                .list();
        acceptFrom(pending, me);
        return pending.size();
    }

    // ─── Blocage et signalement ───────────────────────────────────────────────

    /** Retire les abonnements et demandes dans les deux sens, puis bloque. */
    @Transactional
    public void block(UUID me, String username) {
        ProfileRow target = other(me, username);
        for (UUID[] pair : new UUID[][] {{me, target.id()}, {target.id(), me}}) {
            db.sql("delete from follows where follower_id = :a and followee_id = :b")
                    .param("a", pair[0])
                    .param("b", pair[1])
                    .update();
            db.sql("delete from follow_removals where follower_id = :a and followee_id = :b")
                    .param("a", pair[0])
                    .param("b", pair[1])
                    .update();
            activities.unfollowed(pair[0], pair[1]);
        }
        db.sql("insert into blocks (blocker_id, blocked_id) values (:me, :b) on conflict do nothing")
                .param("me", me)
                .param("b", target.id())
                .update();
    }

    /** Débloquer ne rétablit pas les anciens abonnements. */
    @Transactional
    public void unblock(UUID me, String username) {
        ProfileRow target = other(me, username);
        db.sql("delete from blocks where blocker_id = :me and blocked_id = :b")
                .param("me", me)
                .param("b", target.id())
                .update();
    }

    public List<MemberLite> blocks(UUID me) {
        List<UUID> ids = db.sql("select blocked_id from blocks where blocker_id = :me order by created_at desc")
                .param("me", me)
                .query(UUID.class)
                .list();
        return members.of(me, ids);
    }

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

    /** Profil d'un autre ; introuvable s'il n'existe pas ou s'il m'a bloqué. */
    ProfileRow other(UUID me, String username) {
        ProfileRow target = store.findByUsername(username, clock.instant())
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
        int inserted = db.sql("""
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
        if (inserted > 0 && acceptedAt != null) activities.followed(follower, followee, acceptedAt);
    }

    /** Supprime l'abonnement ; s'il était accepté, le garde de côté pour « Annuler ». */
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
        activities.unfollowed(follower, followee);
    }

    /** Abonnement retiré récemment par {@code removedBy}, consommé. */
    private Optional<Removal> takeRemoval(UUID follower, UUID followee, UUID removedBy) {
        return db.sql("""
                delete from follow_removals
                where follower_id = :f and followee_id = :e and removed_by = :by and removed_at > :since
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
        followers.forEach(follower -> {
            activities.followed(follower, me, now);
            notifications.followAccepted(follower, me);
        });
    }

    /** Compte un nouvel abonnement du jour ; au-delà de la limite, {@code 429}. */
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
                    "Tu as atteint la limite de 200 abonnements par jour");
        }
    }

    private Page<MemberLite> page(UUID me, List<UUID> ids, int offset, int size) {
        boolean more = ids.size() > size;
        List<UUID> shown = more ? ids.subList(0, size) : ids;
        return new Page<>(members.of(me, shown), more ? Cursors.offset(offset + size) : null);
    }
}
