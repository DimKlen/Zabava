package com.zabava.api.social;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.zabava.api.social.SocialStore.MemberRow;
import com.zabava.api.social.SocialStore.ProfileRow;
import com.zabava.api.social.dto.SocialDtos.MemberLite;

/** Construit les {@link MemberLite} vus par l'utilisateur connecté, par lots. */
@Service
public class Members {

    private final SocialStore store;

    public Members(SocialStore store) {
        this.store = store;
    }

    /** Membres dans l'ordre donné ; les comptes sans pseudo sont ignorés. */
    public List<MemberLite> of(UUID me, List<UUID> ids) {
        Map<UUID, MemberLite> byId = byId(me, ids);
        return ids.stream().map(byId::get).filter(Objects::nonNull).toList();
    }

    public Map<UUID, MemberLite> byId(UUID me, Collection<UUID> ids) {
        List<UUID> distinct = ids.stream().distinct().toList();
        Map<UUID, MemberRow> rows = store.members(me, distinct);
        Map<UUID, Integer> common = store.commonCounts(me, distinct);
        Map<UUID, MemberLite> result = new HashMap<>();
        rows.forEach((id, row) -> {
            if (row.profile().username() == null) return;
            result.put(id, lite(row.profile(), followState(me, row), row.followsMe(), common.getOrDefault(id, 0)));
        });
        return result;
    }

    static MemberLite lite(ProfileRow p, String followState, boolean followsMe, int commonCount) {
        return new MemberLite(
                p.username(), displayName(p), p.avatarUrl(), p.isPrivate(), followState, followsMe, commonCount);
    }

    /** Nom affiché, ou le pseudo s'il est vide. */
    static String displayName(ProfileRow p) {
        return p.displayName() == null || p.displayName().isBlank() ? p.username() : p.displayName();
    }

    /** blocked › following › pending › none (moi : none). */
    static String followState(UUID me, MemberRow row) {
        if (row.profile().id().equals(me)) return "none";
        if (row.iBlocked()) return "blocked";
        if ("accepted".equals(row.myStatus())) return "following";
        if ("pending".equals(row.myStatus())) return "pending";
        return "none";
    }
}
