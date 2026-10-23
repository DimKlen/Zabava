package com.zabava.api.social;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.zabava.api.common.ApiException;
import com.zabava.api.social.dto.SocialDtos.UsernameAvailability;

/** Disponibilité et changement de pseudo (specs/social/docs/01 §2, docs/06 §4). */
@Service
public class UsernameService {

    /** Délai entre deux changements, et durée de réservation de l'ancien pseudo. */
    public static final Duration CHANGE_DELAY = Duration.ofDays(30);
    private static final int SUGGESTIONS = 3;
    /** Candidats examinés pour trouver 3 propositions libres. */
    private static final int CANDIDATES = 12;

    private final JdbcClient db;
    private final Clock clock;

    public UsernameService(JdbcClient db, Clock clock) {
        this.db = db;
        this.clock = clock;
    }

    /** Mon pseudo actuel (ou un ancien pseudo encore réservé pour moi) est disponible pour moi. */
    public UsernameAvailability availability(UUID me, String username) {
        if (!Usernames.isWellFormed(username)) return new UsernameAvailability(false, "invalid", List.of());
        if (Usernames.isReserved(username)) return new UsernameAvailability(false, "reserved", suggestions(me, username));
        if (!taken(me, List.of(username)).isEmpty()) {
            return new UsernameAvailability(false, "taken", suggestions(me, username));
        }
        return new UsernameAvailability(true, null, List.of());
    }

    /**
     * Change mon pseudo. Le premier choix, et tout changement avant la fin de l'onboarding (retour
     * à l'étape du pseudo), sont libres ; ensuite un changement tous les 30 jours,
     * l'ancien pseudo restant réservé 30 jours. Erreurs : {@code 422 username_invalid},
     * {@code 409 username_taken}, {@code 429 username_change_too_soon}.
     */
    public void change(UUID me, String username) {
        if (!Usernames.isWellFormed(username) || Usernames.isReserved(username)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "username_invalid", "Pseudo invalide");
        }
        record Current(String username, Instant changedAt, boolean onboarded) {}
        Current current = db.sql("select username, username_changed_at, onboarded_at is not null as onboarded from profiles where id = :me")
                .param("me", me)
                .query((rs, n) -> new Current(
                        rs.getString("username"),
                        SocialStore.instant(rs.getTimestamp("username_changed_at")),
                        rs.getBoolean("onboarded")))
                .single();
        boolean counted = current.username() != null && current.onboarded();
        if (username.equals(current.username())) return;
        Instant now = clock.instant();
        if (current.username() != null && current.changedAt() != null && current.changedAt().plus(CHANGE_DELAY).isAfter(now)) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "username_change_too_soon",
                    "Changement de pseudo trop récent",
                    Map.of("nextChangeAt", current.changedAt().plus(CHANGE_DELAY).toString()));
        }
        if (!taken(me, List.of(username)).isEmpty()) throw taken();
        try {
            db.sql("""
                    update profiles set username = :u,
                      username_changed_at = case when cast(:counted as boolean) then :now else username_changed_at end
                    where id = :me
                    """)
                    .param("u", username)
                    .param("counted", counted)
                    .param("now", Timestamp.from(now))
                    .param("me", me)
                    .update();
        } catch (DuplicateKeyException e) {
            throw taken();
        }
        db.sql("delete from username_history where username = :u and user_id = :me")
                .param("u", username)
                .param("me", me)
                .update();
        if (counted) {
            db.sql("""
                    insert into username_history (username, user_id, released_at) values (:old, :me, :until)
                    on conflict (username) do update set user_id = excluded.user_id, released_at = excluded.released_at
                    """)
                    .param("old", current.username())
                    .param("me", me)
                    .param("until", Timestamp.from(now.plus(CHANGE_DELAY)))
                    .update();
        }
    }

    /** Anciens pseudos libérés (tâche planifiée). */
    public int purge() {
        return db.sql("delete from username_history where released_at <= :now")
                .param("now", Timestamp.from(clock.instant()))
                .update();
    }

    private List<String> suggestions(UUID me, String username) {
        List<String> candidates = Usernames.candidates(username, CANDIDATES);
        Set<String> unavailable = taken(me, candidates);
        return candidates.stream().filter(c -> !unavailable.contains(c)).limit(SUGGESTIONS).toList();
    }

    /** Pseudos pris par un autre compte, ou encore réservés pour un autre compte. */
    private Set<String> taken(UUID me, Collection<String> usernames) {
        return new HashSet<>(db.sql("""
                select username from profiles where username in (:u) and id <> :me
                union
                select username from username_history where username in (:u) and user_id <> :me and released_at > :now
                """)
                .param("u", usernames)
                .param("me", me)
                .param("now", Timestamp.from(clock.instant()))
                .query(String.class)
                .list());
    }

    private static ApiException taken() {
        return new ApiException(HttpStatus.CONFLICT, "username_taken", "Pseudo déjà pris");
    }
}
