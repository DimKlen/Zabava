package com.zabava.api.me;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zabava.api.auth.CurrentUser;
import com.zabava.api.common.ApiException;
import com.zabava.api.me.dto.MeDtos.NotificationPrefs;
import com.zabava.api.me.dto.MeDtos.NotificationPrefsUpdate;
import com.zabava.api.me.dto.MeDtos.Profile;
import com.zabava.api.me.dto.MeDtos.ProfileUpdate;
import com.zabava.api.me.dto.MeDtos.PushTokenRequest;
import com.zabava.api.social.UsernameService;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Profil, préférences, plateformes, jeton push et suppression du compte. */
@Service
public class ProfileService {

    /** Préférences utilisées par le catalogue (région et langue des contenus). */
    public record Prefs(UUID userId, String region, String language, ZoneId timezone, List<Integer> providerIds) {}

    /** Heures proposées pour le récapitulatif quotidien (specs/docs/09 §9.2). */
    private static final Set<Integer> DIGEST_HOURS = Set.of(8, 9, 12, 18, 20);
    private final JdbcClient db;
    private final JsonMapper json;
    private final SupabaseAdminClient supabase;
    private final UsernameService usernames;
    /** Profils dont l'existence est déjà vérifiée : évite une écriture à chaque requête. */
    private final Set<UUID> known = ConcurrentHashMap.newKeySet();

    public ProfileService(JdbcClient db, JsonMapper json, SupabaseAdminClient supabase, UsernameService usernames) {
        this.db = db;
        this.json = json;
        this.supabase = supabase;
        this.usernames = usernames;
    }

    /** Crée le profil s'il manque (normalement fait par le trigger Supabase). */
    public void ensureExists(CurrentUser user) {
        if (known.contains(user.id())) return;
        db.sql("""
                insert into profiles (id, email, display_name, avatar_url, auth_provider)
                select :id, :email, :name, :avatar, :provider
                where exists (select 1 from auth.users where id = :id)
                on conflict (id) do nothing
                """)
                .param("id", user.id())
                .param("email", user.email())
                .param("name", user.displayName())
                .param("avatar", user.avatarUrl())
                .param("provider", user.provider())
                .update();
        boolean exists = db.sql("select count(*) from profiles where id = :id")
                .param("id", user.id())
                .query(Long.class)
                .single() > 0;
        if (!exists) throw new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "unknown_user", "Compte inconnu");
        known.add(user.id());
    }

    public Profile get(UUID userId) {
        return db.sql("""
                select id, display_name, avatar_url, email, auth_provider, region, language,
                       spoiler_protection, notification_prefs::text as prefs, timezone, onboarded_at,
                       username, following_count,
                       (select count(*) from follows f where f.followee_id = profiles.id and f.status = 'pending'
                          and not exists (select 1 from blocks b where b.blocker_id = profiles.id
                            and b.blocked_id = f.follower_id)) as requests
                from profiles where id = :id
                """)
                .param("id", userId)
                .query((rs, n) -> new Profile(
                        rs.getString("id"),
                        rs.getString("display_name"),
                        rs.getString("avatar_url"),
                        rs.getString("email"),
                        rs.getString("auth_provider"),
                        rs.getString("region"),
                        rs.getString("language"),
                        rs.getBoolean("spoiler_protection"),
                        prefs(rs.getString("prefs")),
                        rs.getString("timezone"),
                        instant(rs.getTimestamp("onboarded_at")),
                        providerIds(userId),
                        rs.getString("username"),
                        rs.getInt("following_count"),
                        rs.getInt("requests")))
                .optional()
                .orElseThrow(() -> ApiException.notFound("Profil introuvable"));
    }

    public Prefs prefs(UUID userId) {
        return db.sql("select region, language, timezone from profiles where id = :id")
                .param("id", userId)
                .query((rs, n) -> new Prefs(
                        userId,
                        rs.getString("region"),
                        rs.getString("language"),
                        zone(rs.getString("timezone")),
                        providerIds(userId)))
                .optional()
                .orElseThrow(() -> ApiException.notFound("Profil introuvable"));
    }

    @Transactional
    public Profile update(UUID userId, ProfileUpdate update) {
        Profile current = get(userId);
        NotificationPrefs prefs = merge(current.notificationPrefs(), update.notificationPrefs());
        if (update.username() != null) usernames.change(userId, update.username());
        db.sql("""
                update profiles set
                  region = coalesce(cast(:region as text), region),
                  language = coalesce(cast(:language as text), language),
                  spoiler_protection = coalesce(cast(:spoiler as boolean), spoiler_protection),
                  notification_prefs = cast(:prefs as jsonb),
                  onboarded_at = coalesce(cast(:onboarded as timestamptz), onboarded_at)
                where id = :id
                """)
                .param("region", update.region())
                .param("language", update.language())
                .param("spoiler", update.spoilerProtection())
                .param("prefs", json.writeValueAsString(storedPrefs(prefs)))
                .param("onboarded", update.onboardedAt() == null ? null : Timestamp.from(update.onboardedAt()))
                .param("id", userId)
                .update();
        return get(userId);
    }

    /** Remplace la liste de mes plateformes. */
    @Transactional
    public void setProviders(UUID userId, List<Integer> providerIds) {
        db.sql("delete from user_providers where user_id = :id").param("id", userId).update();
        for (Integer providerId : providerIds.stream().distinct().toList()) {
            db.sql("insert into user_providers (user_id, provider_id) values (:id, :provider)")
                    .param("id", userId)
                    .param("provider", providerId)
                    .update();
        }
    }

    /** Enregistre le jeton Expo de l'appareil et le fuseau du téléphone (specs/docs/11 §4). */
    @Transactional
    public void savePushToken(UUID userId, PushTokenRequest request) {
        db.sql("""
                insert into push_tokens (user_id, expo_token, platform, updated_at)
                values (:id, :token, :platform, now())
                on conflict (user_id, expo_token) do update set platform = excluded.platform, updated_at = now()
                """)
                .param("id", userId)
                .param("token", request.expoToken())
                .param("platform", request.platform())
                .update();
        if (request.timezone() != null) {
            zone(request.timezone());
            db.sql("update profiles set timezone = :tz where id = :id")
                    .param("tz", request.timezone())
                    .param("id", userId)
                    .update();
        }
    }

    public void deletePushToken(UUID userId, String expoToken) {
        db.sql("delete from push_tokens where user_id = :id and expo_token = :token")
                .param("id", userId)
                .param("token", expoToken)
                .update();
    }

    /** Supprime le compte Supabase et toutes les données (cascade). */
    @Transactional
    public void deleteAccount(UUID userId) {
        supabase.deleteUser(userId);
        db.sql("delete from profiles where id = :id").param("id", userId).update();
        known.remove(userId);
    }

    private List<Integer> providerIds(UUID userId) {
        return db.sql("select provider_id from user_providers where user_id = :id order by provider_id")
                .param("id", userId)
                .query(Integer.class)
                .list();
    }

    private NotificationPrefs prefs(String raw) {
        JsonNode node = json.readTree(raw);
        return new NotificationPrefs(
                node.path("episodes").asBoolean(true),
                node.path("cinema").asBoolean(true),
                node.path("streaming").asBoolean(true),
                node.path("seasons").asBoolean(true),
                node.path("digest_hour").asInt(9),
                node.path("follow_requests").asBoolean(true));
    }

    /** Format stocké dans profiles.notification_prefs (specs/docs/09 §9.2) : clé {@code digest_hour}. */
    private static Map<String, Object> storedPrefs(NotificationPrefs prefs) {
        Map<String, Object> stored = new LinkedHashMap<>();
        stored.put("episodes", prefs.episodes());
        stored.put("cinema", prefs.cinema());
        stored.put("streaming", prefs.streaming());
        stored.put("seasons", prefs.seasons());
        stored.put("digest_hour", prefs.digestHour());
        stored.put("follow_requests", prefs.followRequests());
        return stored;
    }

    private static NotificationPrefs merge(NotificationPrefs current, NotificationPrefsUpdate update) {
        if (update == null) return current;
        if (update.digestHour() != null && !DIGEST_HOURS.contains(update.digestHour())) {
            throw ApiException.badRequest("Heure du récapitulatif invalide : " + update.digestHour());
        }
        return new NotificationPrefs(
                update.episodes() != null ? update.episodes() : current.episodes(),
                update.cinema() != null ? update.cinema() : current.cinema(),
                update.streaming() != null ? update.streaming() : current.streaming(),
                update.seasons() != null ? update.seasons() : current.seasons(),
                update.digestHour() != null ? update.digestHour() : current.digestHour(),
                update.followRequests() != null ? update.followRequests() : current.followRequests());
    }

    private static ZoneId zone(String id) {
        try {
            return ZoneId.of(id);
        } catch (Exception e) {
            throw ApiException.badRequest("Fuseau horaire inconnu : " + id);
        }
    }

    static Instant instant(Timestamp ts) {
        return ts == null ? null : ts.toInstant();
    }
}
