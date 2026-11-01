package com.zabava.api.social;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

/**
 * Suivi à sens unique et instantané (retours du 2026-11-01) : pas de demande, visibilité réservée
 * à ceux qu'on suit, limite du jour.
 */
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

    private long following(UUID id) {
        return count("select following_count from profiles where id = ?", id);
    }

    /** Suivre est instantané : aucune demande, aucune confirmation, l'autre n'est pas concerné. */
    @Test
    void suivreEstInstantaneEtASensUnique() throws Exception {
        follow(dim, "lea.m").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("accepted"));
        // Idempotent : un second tap ne crée rien et ne compte pas deux fois.
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("accepted"));
        assertThat(count("select count(*) from follows where status = 'accepted'")).isEqualTo(1);
        assertThat(count("select count(*) from follows where status = 'pending'")).isZero();
        assertThat(count("select count from follow_quota where user_id = ?", dim)).isEqualTo(1);
        assertThat(following(dim)).isEqualTo(1);
        assertThat(following(lea)).isZero();

        mvc.perform(as(dim, get("/api/v1/users/lea.m")))
                .andExpect(jsonPath("$.followState").value("following"))
                .andExpect(jsonPath("$.canSeeLists").value(true))
                .andExpect(jsonPath("$.isMe").value(false))
                .andExpect(jsonPath("$.followsMe").doesNotExist());
        // Léa ne voit pas Dim comme « suivi » et ne voit pas ses listes : le suivi ne marche que dans un sens.
        mvc.perform(as(lea, get("/api/v1/users/dim.k")))
                .andExpect(jsonPath("$.followState").value("none"))
                .andExpect(jsonPath("$.canSeeLists").value(false));
        mvc.perform(as(lea, get("/api/v1/me/profile")))
                .andExpect(jsonPath("$.friendsCount").value(0))
                .andExpect(jsonPath("$.followRequestsCount").doesNotExist());
    }

    /** Plus de demandes : les anciens points d'entrée n'existent plus. */
    @Test
    void plusDeDemandes() throws Exception {
        follow(dim, "lea.m");
        mvc.perform(as(lea, get("/api/v1/me/follow-requests"))).andExpect(status().isNotFound());
        mvc.perform(as(lea, post("/api/v1/me/follow-requests/dim.k/accept"))).andExpect(status().isNotFound());
    }

    /** Seuls ceux que je suis laissent voir leurs listes (403 sinon). */
    @Test
    void seulsLesSuivisLaissentVoirListes() throws Exception {
        follow(max, "lea.m");

        mvc.perform(as(dim, get("/api/v1/users/lea.m")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followState").value("none"))
                .andExpect(jsonPath("$.canSeeLists").value(false));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("private_profile"));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/friends"))).andExpect(status().isForbidden());

        // Suivi : tout est visible, dès le suivi.
        follow(dim, "lea.m");
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=watched"))).andExpect(status().isOk());
        mvc.perform(as(max, get("/api/v1/users/lea.m/titles?type=movie&status=watched"))).andExpect(status().isOk());
        // Mes propres abonnements me sont toujours visibles.
        mvc.perform(as(lea, get("/api/v1/users/lea.m/friends"))).andExpect(status().isOk());
    }

    /** Le 201e suivi du jour renvoie 429. */
    @Test
    void le201eSuiviDuJourEstRefuse() throws Exception {
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
    void neplusSuivrePuisAnnulerRetabliLeSuiviDOrigine() throws Exception {
        follow(dim, "lea.m");
        db.sql("update follows set created_at = '2026-09-01T10:00:00Z', accepted_at = '2026-09-02T10:00:00Z'").update();
        db.sql("delete from follow_quota").update();

        mvc.perform(as(dim, delete("/api/v1/users/lea.m/follow"))).andExpect(status().isNoContent());
        assertThat(count("select count(*) from follows")).isZero();
        assertThat(following(dim)).isZero();
        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(jsonPath("$.followState").value("none"));

        // « Annuler » : suivi de nouveau, avec la même date, hors limite du jour.
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("accepted"));
        assertThat(db.sql("select accepted_at from follows").query(Instant.class).list())
                .containsExactly(Instant.parse("2026-09-02T10:00:00Z"));
        assertThat(count("select count(*) from follow_quota where user_id = ?", dim)).isZero();
        assertThat(following(dim)).isEqualTo(1);
    }

    @Test
    void neplusSuivreNeTouchePasLeSuiviDeLAutre() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        mvc.perform(as(lea, delete("/api/v1/users/dim.k/follow"))).andExpect(status().isNoContent());

        assertThat(count("select count(*) from follows")).isEqualTo(1);
        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(jsonPath("$.followState").value("following"));
    }

    @Test
    void ceQueLAutreAretireNeSeRetablitPasPourMoi() throws Exception {
        follow(dim, "lea.m");
        mvc.perform(as(dim, delete("/api/v1/users/lea.m/follow"))).andExpect(status().isNoContent());

        // Le retrait de Dim ne rétablit rien pour Max : il passe par la limite du jour comme un nouveau suivi.
        follow(max, "lea.m").andExpect(jsonPath("$.status").value("accepted"));
        assertThat(count("select count(*) from follow_quota where user_id = ?", max)).isEqualTo(1);
    }

    @Test
    void onNePeutPasSAjouterSoiMeme() throws Exception {
        follow(dim, "dim.k").andExpect(status().isBadRequest());
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
    void suivisPlusRecentsDAbordAvecFiltre() throws Exception {
        follow(lea, "dim.k");
        follow(lea, "max.dubois");
        db.sql("update follows set accepted_at = '2026-10-01T00:00:00Z' where followee_id = :d")
                .param("d", dim)
                .update();

        mvc.perform(as(lea, get("/api/v1/users/lea.m/friends")))
                .andExpect(jsonPath("$.items[*].username", contains("max.dubois", "dim.k")))
                .andExpect(jsonPath("$.nextCursor").doesNotExist());
        mvc.perform(as(lea, get("/api/v1/users/lea.m/friends?q=DUBO")))
                .andExpect(jsonPath("$.items[*].username", contains("max.dubois")));
    }

    @Test
    void supprimerSonCompteMetAJourLesCompteursDesAutres() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        follow(max, "dim.k");
        WIREMOCK.stubFor(WireMock.delete(urlEqualTo("/supabase/auth/v1/admin/users/" + dim))
                .willReturn(aResponse().withStatus(200)));

        mvc.perform(as(dim, delete("/api/v1/me"))).andExpect(status().isNoContent());

        assertThat(following(lea)).isZero();
        assertThat(count("select followers_count from profiles where id = ?", lea)).isZero();
        assertThat(count("select count(*) from follows")).isZero();
        assertThat(count("select count(*) from activities")).isZero();
    }

    /**
     * Supabase supprime un compte avec son propre rôle (supabase_auth_admin), qui n'a aucun droit
     * sur public : la cascade et les triggers sociaux doivent passer quand même.
     */
    @Test
    void laSuppressionParSupabaseAuthPasseLaCascadeSociale() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        mvc.perform(as(lea, delete("/api/v1/users/dim.k/follow")));
        befriend(dim, "dim.k", max, "max.dubois");
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
        assertThat(following(lea)).isZero();
        assertThat(following(max)).isZero();
    }

    /** Clients directs (clé Supabase) : ni lecture ni écriture, tout passe par le backend. */
    @Test
    void laRlsInterditDeDevenirAmisSansPasserParLeBackend() throws Exception {
        follow(max, "lea.m");
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        assertThatThrownBy(() -> tx.execute(s -> {
            db.sql("set local role authenticated").update();
            db.sql("select set_config('request.jwt.claim.sub', :sub, true)").param("sub", dim.toString()).query().singleValue();
            return db.sql("select count(*) from follows").query(Long.class).single();
        })).isInstanceOf(DataAccessException.class);
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
