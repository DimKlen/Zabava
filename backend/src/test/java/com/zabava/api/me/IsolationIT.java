package com.zabava.api.me;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.transaction.support.TransactionTemplate;

import com.zabava.api.IntegrationTest;

/** Critère de l'étape 3 : un utilisateur ne peut jamais lire les données d'un autre. */
class IsolationIT extends IntegrationTest {

    @Autowired
    private TransactionTemplate tx;

    private UUID alice;
    private UUID bob;
    private long aliceEpisode;

    @BeforeEach
    void setUp() throws Exception {
        stubCatalog();
        alice = createUser("alice@example.com");
        bob = createUser("bob@example.com");
        mvc.perform(as(alice, post("/api/v1/me/titles"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tmdbId\": 1399, \"type\": \"tv\", \"status\": \"following\"}"))
                .andExpect(status().isCreated());
        aliceEpisode = db.sql("select min(id) from episodes where season_number = 1").query(Long.class).single();
        mvc.perform(as(alice, post("/api/v1/me/episodes/watched"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"episodeIds\": [" + aliceEpisode + "]}"))
                .andExpect(status().isNoContent());
        mvc.perform(as(alice, put("/api/v1/me/providers"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"providerIds\": [8]}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void laListeDAliceEstInvisiblePourBob() throws Exception {
        mvc.perform(as(bob, get("/api/v1/me/watchlist?type=tv"))).andExpect(jsonPath("$", hasSize(0)));
        mvc.perform(as(bob, get("/api/v1/me/upcoming?from=2026-10-11&to=2027-01-08")))
                .andExpect(jsonPath("$.events", hasSize(0)))
                .andExpect(jsonPath("$.noDate", hasSize(0)));
        mvc.perform(as(bob, get("/api/v1/me/profile")))
                .andExpect(jsonPath("$.email").value("bob@example.com"))
                .andExpect(jsonPath("$.providerIds", hasSize(0)));
    }

    @Test
    void lesEpisodesVusDAliceSontInvisiblesPourBob() throws Exception {
        WIREMOCK.stubFor(com.github.tomakehurst.wiremock.client.WireMock.get(
                        com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo("/tmdb/tv/1399/season/1"))
                .willReturn(com.github.tomakehurst.wiremock.client.WireMock.okJson(
                        "{\"name\": \"Saison 1\", \"episodes\": [{\"episode_number\": 1, \"name\": \"Système\"}]}")));
        mvc.perform(as(bob, get("/api/v1/titles/tv/1399/seasons/1")))
                .andExpect(jsonPath("$.episodes[0].watchedAt").doesNotExist());
        mvc.perform(as(alice, get("/api/v1/titles/tv/1399/seasons/1")))
                .andExpect(jsonPath("$.episodes[0].watchedAt").exists());
    }

    @Test
    void bobNePeutNiModifierNiRetirerLeSuiviDAlice() throws Exception {
        mvc.perform(as(bob, patch("/api/v1/me/titles/tv-1399"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"abandoned\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(as(bob, delete("/api/v1/me/titles/tv-1399"))).andExpect(status().isNoContent());
        mvc.perform(as(bob, delete("/api/v1/me/episodes/watched"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"episodeIds\": [" + aliceEpisode + "]}"))
                .andExpect(status().isNoContent());

        mvc.perform(as(alice, get("/api/v1/me/watchlist?type=tv")))
                .andExpect(jsonPath("$[0].userTitle.status").value("following"))
                .andExpect(jsonPath("$[0].episodes[1].watchedAt").exists());
    }

    /** Clé publique de Supabase (rôles anon et authenticated) : aucun droit sur les tables ni les fonctions. */
    @Test
    void aucunAccesDirectAuxTablesAvecLaClePublique() {
        List<String> exposed = db.sql("""
                select r.rolname || ' ' || c.relname
                from pg_class c join pg_namespace n on n.oid = c.relnamespace
                cross join (values ('anon'), ('authenticated')) r(rolname)
                where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'S')
                  and (has_table_privilege(r.rolname, c.oid, 'select')
                    or has_table_privilege(r.rolname, c.oid, 'insert')
                    or has_table_privilege(r.rolname, c.oid, 'update')
                    or has_table_privilege(r.rolname, c.oid, 'delete'))
                union all
                select r.rolname || ' ' || p.proname || '()'
                from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                cross join (values ('anon'), ('authenticated')) r(rolname)
                where n.nspname = 'public' and has_function_privilege(r.rolname, p.oid, 'execute')
                """).query(String.class).list();
        assertThat(exposed).isEmpty();
    }

    /** Le pseudo est figé : même son propriétaire ne peut pas le changer en écrivant directement en base. */
    @Test
    void sonProfilNeSeModifiePasEnDirect() {
        assertThatThrownBy(() -> tx.executeWithoutResult(status -> {
                    db.sql("set local role authenticated").update();
                    db.sql("select set_config('request.jwt.claim.sub', :sub, true)")
                            .param("sub", alice.toString())
                            .query()
                            .singleValue();
                    db.sql("update profiles set display_name = 'Pirate' where id = auth.uid()").update();
                }))
                .rootCause()
                .hasMessageContaining("permission denied");
    }
}
