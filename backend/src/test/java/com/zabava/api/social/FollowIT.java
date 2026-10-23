package com.zabava.api.social;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.github.tomakehurst.wiremock.client.WireMock;

/** Suivre, demandes, visibilité, blocage, limite du jour (specs/social/etapes/01). */
class FollowIT extends SocialTest {

    @Autowired
    private PlatformTransactionManager transactionManager;

    private UUID dim;
    private UUID lea;
    private UUID max;

    @BeforeEach
    void setUp() {
        stubCatalog();
        dim = member("dim.k", "Dim");
        lea = member("lea.m", "Léa Martin");
        max = member("max.dubois", "Max Dubois");
    }

    private long followers(UUID id) {
        return count("select followers_count from profiles where id = ?", id);
    }

    private long following(UUID id) {
        return count("select following_count from profiles where id = ?", id);
    }

    @Test
    void suivreUnProfilPublicEstImmediat() throws Exception {
        follow(dim, "lea.m").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("accepted"));
        // Idempotent : un second tap ne crée rien.
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("accepted"));

        assertThat(followers(lea)).isEqualTo(1);
        assertThat(following(dim)).isEqualTo(1);
        assertThat(count("select count from follow_quota where user_id = ?", dim)).isEqualTo(1);
        mvc.perform(as(dim, get("/api/v1/users/lea.m")))
                .andExpect(jsonPath("$.followState").value("following"))
                .andExpect(jsonPath("$.followersCount").value(1))
                .andExpect(jsonPath("$.canSeeLists").value(true))
                .andExpect(jsonPath("$.isMe").value(false));
        mvc.perform(as(lea, get("/api/v1/users/dim.k")))
                .andExpect(jsonPath("$.followsMe").value(true))
                .andExpect(jsonPath("$.followState").value("none"));
    }

    @Test
    void suivreUnProfilPriveEnvoieUneDemande() throws Exception {
        makePrivate(lea);
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("pending"));
        assertThat(followers(lea)).isZero();

        mvc.perform(as(lea, get("/api/v1/me/follow-requests")))
                .andExpect(jsonPath("$.items[*].username", contains("dim.k")));
        mvc.perform(as(lea, get("/api/v1/me/profile"))).andExpect(jsonPath("$.followRequestsCount").value(1));

        mvc.perform(as(lea, post("/api/v1/me/follow-requests/dim.k/accept"))).andExpect(status().isNoContent());
        assertThat(followers(lea)).isEqualTo(1);
        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(jsonPath("$.followState").value("following"));
    }

    @Test
    void refuserUneDemandeLaFaitDisparaitre() throws Exception {
        makePrivate(lea);
        follow(dim, "lea.m");
        mvc.perform(as(lea, post("/api/v1/me/follow-requests/dim.k/decline"))).andExpect(status().isNoContent());
        mvc.perform(as(lea, get("/api/v1/me/follow-requests"))).andExpect(jsonPath("$.items", hasSize(0)));
        // Elle peut en renvoyer une.
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("pending"));
    }

    /** Critère : un profil privé non suivi renvoie 403 sur /titles et /followers. */
    @Test
    void unProfilPriveNonSuiviCacheSesListes() throws Exception {
        makePrivate(lea);
        follow(max, "lea.m");
        mvc.perform(as(lea, post("/api/v1/me/follow-requests/max.dubois/accept")));
        follow(dim, "lea.m");

        mvc.perform(as(dim, get("/api/v1/users/lea.m")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followState").value("pending"))
                .andExpect(jsonPath("$.followersCount").value(1))
                .andExpect(jsonPath("$.canSeeLists").value(false));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("private_profile"));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/followers"))).andExpect(status().isForbidden());
        mvc.perform(as(dim, get("/api/v1/users/lea.m/following"))).andExpect(status().isForbidden());

        // Abonné accepté : tout redevient visible.
        mvc.perform(as(max, get("/api/v1/users/lea.m/titles?type=movie&status=watched"))).andExpect(status().isOk());
        mvc.perform(as(max, get("/api/v1/users/lea.m/followers")))
                .andExpect(jsonPath("$.items[*].username", contains("max.dubois")));
        // Mes propres listes me sont toujours visibles.
        mvc.perform(as(lea, get("/api/v1/users/lea.m/followers"))).andExpect(status().isOk());
    }

    /** Critère : un utilisateur qui m'a bloqué renvoie 404. */
    @Test
    void unUtilisateurQuiMABloqueEstIntrouvable() throws Exception {
        mvc.perform(as(lea, post("/api/v1/users/dim.k/block"))).andExpect(status().isNoContent());

        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(status().isNotFound());
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=watched"))).andExpect(status().isNotFound());
        mvc.perform(as(dim, get("/api/v1/users/lea.m/followers"))).andExpect(status().isNotFound());
        follow(dim, "lea.m").andExpect(status().isForbidden());
        mvc.perform(as(dim, get("/api/v1/users/search?q=lea"))).andExpect(jsonPath("$.items", hasSize(0)));

        // Côté bloqueur : profil visible, bouton « Débloquer », listes masquées.
        mvc.perform(as(lea, get("/api/v1/users/dim.k")))
                .andExpect(jsonPath("$.followState").value("blocked"))
                .andExpect(jsonPath("$.canSeeLists").value(false));
        mvc.perform(as(lea, get("/api/v1/users/dim.k/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("blocked"));
        mvc.perform(as(lea, get("/api/v1/me/blocks"))).andExpect(jsonPath("$[*].username", contains("dim.k")));
    }

    /** Critère : bloquer supprime les abonnements dans les deux sens. */
    @Test
    void bloquerSupprimeLesAbonnementsDansLesDeuxSens() throws Exception {
        follow(dim, "lea.m");
        follow(lea, "dim.k");
        makePrivate(max);
        follow(dim, "max.dubois");

        mvc.perform(as(dim, post("/api/v1/users/lea.m/block"))).andExpect(status().isNoContent());
        mvc.perform(as(dim, post("/api/v1/users/max.dubois/block"))).andExpect(status().isNoContent());

        assertThat(count("select count(*) from follows")).isZero();
        assertThat(count("select count(*) from activities where type = 'followed'")).isZero();
        assertThat(followers(lea)).isZero();
        assertThat(following(lea)).isZero();
        assertThat(followers(dim)).isZero();
        assertThat(following(dim)).isZero();
        follow(dim, "lea.m").andExpect(status().isForbidden());

        // Débloquer ne rétablit pas les anciens abonnements.
        mvc.perform(as(dim, delete("/api/v1/users/lea.m/block"))).andExpect(status().isNoContent());
        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(jsonPath("$.followState").value("none"));
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("accepted"));
    }

    /** Critère : passer de privé à public accepte toutes les demandes. */
    @Test
    void passerDePriveAPublicAccepteLesDemandes() throws Exception {
        makePrivate(lea);
        follow(dim, "lea.m");
        follow(max, "lea.m");

        mvc.perform(json(lea, put("/api/v1/me/profile"), "{\"isPrivate\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPrivate").value(false))
                .andExpect(jsonPath("$.followersCount").value(2))
                .andExpect(jsonPath("$.followRequestsCount").value(0));
        assertThat(count("select count(*) from follows where status = 'accepted'")).isEqualTo(2);
        // Public → privé : les abonnés restent abonnés.
        mvc.perform(json(lea, put("/api/v1/me/profile"), "{\"isPrivate\": true}"))
                .andExpect(jsonPath("$.followersCount").value(2));
    }

    /** Critère : le 201e abonnement du jour renvoie 429. */
    @Test
    void le201eAbonnementDuJourEstRefuse() throws Exception {
        db.sql("insert into follow_quota (user_id, day, count) values (:me, date '2026-10-11', 199)")
                .param("me", dim)
                .update();
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("accepted"));
        follow(dim, "max.dubois")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("follow_limit"));
        assertThat(count("select count(*) from follows where follower_id = ?", dim)).isEqualTo(1);
        // Le compteur de la veille ne compte pas.
        db.sql("update follow_quota set day = date '2026-10-10'").update();
        follow(dim, "max.dubois").andExpect(jsonPath("$.status").value("accepted"));
    }

    @Test
    void annulerUnDesabonnementRetablitLAbonnementDOrigine() throws Exception {
        makePrivate(lea);
        follow(dim, "lea.m");
        mvc.perform(as(lea, post("/api/v1/me/follow-requests/dim.k/accept")));
        db.sql("update follows set created_at = '2026-09-01T10:00:00Z', accepted_at = '2026-09-02T10:00:00Z'").update();

        mvc.perform(as(dim, delete("/api/v1/users/lea.m/follow"))).andExpect(status().isNoContent());
        assertThat(followers(lea)).isZero();
        assertThat(count("select count(*) from activities where type = 'followed'")).isZero();

        // « Annuler » : de nouveau abonné (pas une demande), avec les mêmes dates, hors limite du jour.
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("accepted"));
        assertThat(db.sql("select accepted_at from follows").query(Instant.class).single())
                .isEqualTo(Instant.parse("2026-09-02T10:00:00Z"));
        assertThat(count("select count from follow_quota where user_id = ?", dim)).isEqualTo(1);
        assertThat(db.sql("select created_at from activities where type = 'followed'").query(Instant.class).single())
                .isEqualTo(Instant.parse("2026-09-02T10:00:00Z"));
    }

    @Test
    void annulerUneDemandeNeLaRetablitPas() throws Exception {
        makePrivate(lea);
        follow(dim, "lea.m");
        mvc.perform(as(dim, delete("/api/v1/users/lea.m/follow"))).andExpect(status().isNoContent());
        assertThat(count("select count(*) from follows")).isZero();
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("pending"));
    }

    @Test
    void retirerUnAbonnePuisAnnuler() throws Exception {
        follow(dim, "lea.m");
        mvc.perform(as(lea, delete("/api/v1/me/followers/dim.k"))).andExpect(status().isNoContent());
        assertThat(followers(lea)).isZero();
        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(jsonPath("$.followState").value("none"));

        mvc.perform(as(lea, post("/api/v1/me/followers/dim.k/restore"))).andExpect(status().isNoContent());
        assertThat(followers(lea)).isEqualTo(1);
        assertThat(count("select count(*) from activities where type = 'followed'")).isEqualTo(1);
        // Rien à rétablir une seconde fois, et personne d'autre ne peut se faire ajouter.
        mvc.perform(as(lea, post("/api/v1/me/followers/max.dubois/restore"))).andExpect(status().isNotFound());
    }

    @Test
    void toutAccepter() throws Exception {
        makePrivate(lea);
        follow(dim, "lea.m");
        follow(max, "lea.m");
        mvc.perform(as(lea, post("/api/v1/me/follow-requests/accept-all")))
                .andExpect(jsonPath("$.accepted").value(2));
        assertThat(followers(lea)).isEqualTo(2);
    }

    @Test
    void onNePeutPasSeSuivreSoiMeme() throws Exception {
        follow(dim, "dim.k").andExpect(status().isBadRequest());
        mvc.perform(as(dim, post("/api/v1/users/dim.k/block"))).andExpect(status().isBadRequest());
        follow(dim, "inconnu").andExpect(status().isNotFound());
    }

    @Test
    void signalerUneFoisParMotif() throws Exception {
        for (int i = 0; i < 2; i++) {
            mvc.perform(json(dim, post("/api/v1/users/lea.m/report"), "{\"reason\": \"spam\"}"))
                    .andExpect(status().isNoContent());
        }
        mvc.perform(json(dim, post("/api/v1/users/lea.m/report"), "{\"reason\": \"insulte\"}"))
                .andExpect(status().isBadRequest());
        assertThat(count("select count(*) from reports")).isEqualTo(1);
    }

    @Test
    void abonnesEtAbonnementsPlusRecentsDAbordAvecFiltre() throws Exception {
        follow(dim, "lea.m");
        follow(max, "lea.m");
        db.sql("update follows set accepted_at = '2026-10-01T00:00:00Z' where follower_id = :d").param("d", dim).update();

        mvc.perform(as(dim, get("/api/v1/users/lea.m/followers")))
                .andExpect(jsonPath("$.items[*].username", contains("max.dubois", "dim.k")))
                .andExpect(jsonPath("$.nextCursor").doesNotExist());
        mvc.perform(as(dim, get("/api/v1/users/lea.m/followers?q=DUBO")))
                .andExpect(jsonPath("$.items[*].username", contains("max.dubois")));
        mvc.perform(as(lea, get("/api/v1/users/dim.k/following")))
                .andExpect(jsonPath("$.items[0].username").value("lea.m"))
                .andExpect(jsonPath("$.items[0].displayName").value("Léa Martin"))
                .andExpect(jsonPath("$.items[0].followsMe").value(false));
    }

    @Test
    void supprimerSonCompteMetAJourLesCompteursDesAutres() throws Exception {
        follow(dim, "lea.m");
        follow(lea, "dim.k");
        follow(max, "dim.k");
        WIREMOCK.stubFor(WireMock.delete(urlEqualTo("/supabase/auth/v1/admin/users/" + dim))
                .willReturn(aResponse().withStatus(200)));

        mvc.perform(as(dim, delete("/api/v1/me"))).andExpect(status().isNoContent());

        assertThat(followers(lea)).isZero();
        assertThat(following(lea)).isZero();
        assertThat(following(max)).isZero();
        assertThat(count("select count(*) from follows")).isZero();
        assertThat(count("select count(*) from activities")).isZero();
    }

    /**
     * Supabase supprime un compte avec son propre rôle (supabase_auth_admin), qui n'a aucun droit
     * sur public : la cascade et les triggers sociaux doivent passer quand même.
     */
    @Test
    void laSuppressionParSupabaseAuthPasseLaCascadeSociale() throws Exception {
        follow(dim, "lea.m");
        follow(lea, "dim.k");
        mvc.perform(as(lea, delete("/api/v1/me/followers/dim.k")));
        follow(dim, "max.dubois");
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        tx.executeWithoutResult(s -> {
            db.sql("""
                    do $$ begin
                      if not exists (select 1 from pg_roles where rolname = 'auth_admin_test') then
                        create role auth_admin_test nologin;
                      end if;
                    end $$
                    """).update();
            db.sql("grant usage on schema auth to auth_admin_test").update();
            db.sql("grant select, delete on auth.users to auth_admin_test").update();
            db.sql("set local role auth_admin_test").update();
            db.sql("delete from auth.users where id = :id").param("id", dim).update();
        });
        assertThat(followers(lea)).isZero();
        assertThat(following(lea)).isZero();
    }

    /** Clients directs (clé Supabase) : lecture de leurs lignes seulement, aucune écriture. */
    @Test
    void laRlsInterditDeSAbonnerSansPasserParLeBackend() throws Exception {
        follow(max, "lea.m");
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        Long visible = tx.execute(s -> {
            db.sql("set local role authenticated").update();
            db.sql("select set_config('request.jwt.claim.sub', :sub, true)").param("sub", dim.toString()).query().singleValue();
            return db.sql("select count(*) from follows").query(Long.class).single();
        });
        assertThat(visible).isZero();
        assertThatThrownBy(() -> tx.execute(s -> {
            db.sql("set local role authenticated").update();
            db.sql("select set_config('request.jwt.claim.sub', :sub, true)").param("sub", dim.toString()).query().singleValue();
            return db.sql("insert into follows (follower_id, followee_id, status) values (:d, :l, 'accepted')")
                    .param("d", dim)
                    .param("l", lea)
                    .update();
        })).isInstanceOf(DataAccessException.class);
    }
}
