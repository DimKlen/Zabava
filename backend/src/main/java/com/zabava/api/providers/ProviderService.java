package com.zabava.api.providers;

import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.zabava.api.catalog.Regions;
import com.zabava.api.catalog.TmdbMapper;
import com.zabava.api.catalog.dto.CatalogDtos.Provider;
import com.zabava.api.common.Json;
import com.zabava.api.tmdb.TmdbClient;

import tools.jackson.databind.JsonNode;

/** Plateformes d'abonnement d'une région (onboarding, Profil › Mes plateformes). */
@Service
public class ProviderService {

    /** Pays dont les plateformes sont chargées. */
    public static final List<String> REGIONS = Regions.ALL;

    private final JdbcClient db;
    private final TmdbClient tmdb;

    public ProviderService(JdbcClient db, TmdbClient tmdb) {
        this.db = db;
        this.tmdb = tmdb;
    }

    /** Plateformes de tous les pays, triées par meilleure priorité d'affichage TMDB. */
    public List<Provider> all() {
        return db.sql("""
                select p.id, p.name, p.short, p.logo_path from provider_regions r
                join providers p on p.id = r.provider_id
                group by p.id, p.name, p.short, p.logo_path
                order by min(coalesce(r.display_priority, 999)), p.name
                """)
                .query((rs, n) -> new Provider(
                        rs.getInt("id"),
                        rs.getString("name"),
                        rs.getString("short") != null ? rs.getString("short") : TmdbMapper.shortName(rs.getString("name")),
                        rs.getString("logo_path"),
                        null,
                        List.of()))
                .list();
    }

    /**
     * Remplit providers et provider_regions depuis TMDB {@code /watch/providers/movie} et {@code /tv}
     * pour les 5 régions. Idempotent ; à lancer une fois avec la clé TMDB (voir backend/README.md).
     */
    @Transactional
    public int seed() {
        int count = 0;
        for (String region : REGIONS) {
            for (String type : List.of("movie", "tv")) {
                JsonNode body = tmdb.get("/watch/providers/" + type,
                        TmdbClient.params("watch_region", region, "language", "fr-CA"));
                for (JsonNode p : Json.array(body, "results")) {
                    int id = p.path("provider_id").asInt();
                    String name = Json.text(p, "provider_name");
                    Integer priority = Json.integer(p.path("display_priorities"), region);
                    if (priority == null) priority = Json.integer(p, "display_priority");
                    db.sql("""
                            insert into providers (id, name, short, logo_path, display_priority)
                            values (:id, :name, :short, :logo, :priority)
                            on conflict (id) do update set name = excluded.name, logo_path = excluded.logo_path
                            """)
                            .param("id", id)
                            .param("name", name)
                            .param("short", TmdbMapper.shortName(name))
                            .param("logo", Json.text(p, "logo_path"))
                            .param("priority", priority)
                            .update();
                    count += db.sql("""
                            insert into provider_regions (provider_id, region, display_priority)
                            values (:id, :region, :priority)
                            on conflict (provider_id, region) do update set display_priority = excluded.display_priority
                            """)
                            .param("id", id)
                            .param("region", region)
                            .param("priority", priority)
                            .update();
                }
            }
        }
        return count;
    }
}
