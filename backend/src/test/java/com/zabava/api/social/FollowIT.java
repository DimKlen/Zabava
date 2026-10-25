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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.github.tomakehurst.wiremock.client.WireMock;

/**
 * Amis réciproques (retours du 2026-10-24) : demandes, amitié dans les deux sens, visibilité
 * réservée aux amis, limite du jour.
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

    private long friends(UUID id) {
        return count("select following_count from profiles where id = ?", id);
    }

    @Test
    void uneDemandeAccepteeRendAmisDansLesDeuxSens() throws Exception {
        follow(dim, "lea.m").andExpect(status().isOk()).andExpect(jsonPath("$.status").value("pending"));
        // Idempotent : un second tap ne crée rien.
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("pending"));
        assertThat(friends(dim)).isZero();
        assertThat(count("select count from follow_quota where user_id = ?", dim)).isEqualTo(1);

        mvc.perform(as(dim, get("/api/v1/users/lea.m")))
                .andExpect(jsonPath("$.followState").value("pending"))
                .andExpect(jsonPath("$.canSeeLists").value(false));
        mvc.perform(as(lea, get("/api/v1/users/dim.k"))).andExpect(jsonPath("$.followState").value("requested"));
        mvc.perform(as(lea, get("/api/v1/me/follow-requests")))
                .andExpect(jsonPath("$.items[*].username", contains("dim.k")));
        mvc.perform(as(lea, get("/api/v1/me/profile"))).andExpect(jsonPath("$.followRequestsCount").value(1));

        mvc.perform(as(lea, post("/api/v1/me/follow-requests/dim.k/accept"))).andExpect(status().isNoContent());

        assertThat(count("select count(*) from follows where status = 'accepted'")).isEqualTo(2);
        assertThat(friends(dim)).isEqualTo(1);
        assertThat(friends(lea)).isEqualTo(1);
        for (UUID[] pair : List.of(new UUID[] {dim, lea}, new UUID[] {lea, dim})) {
            String other = pair[1].equals(lea) ? "lea.m" : "dim.k";
            mvc.perform(as(pair[0], get("/api/v1/users/" + other)))
                    .andExpect(jsonPath("$.followState").value("following"))
                    .andExpect(jsonPath("$.followsMe").value(true))
                    .andExpect(jsonPath("$.friendsCount").value(1))
                    .andExpect(jsonPath("$.canSeeLists").value(true))
                    .andExpect(jsonPath("$.isMe").value(false));
        }
        mvc.perform(as(lea, get("/api/v1/me/profile")))
                .andExpect(jsonPath("$.friendsCount").value(1))
                .andExpect(jsonPath("$.followRequestsCount").value(0));
    }

    @Test
    void deuxDemandesCroiseesDonnentUneAmitie() throws Exception {
        follow(dim, "lea.m");
        follow(lea, "dim.k").andExpect(jsonPath("$.status").value("accepted"));

        assertThat(count("select count(*) from follows where status = 'accepted'")).isEqualTo(2);
        assertThat(friends(dim)).isEqualTo(1);
        mvc.perform(as(lea, get("/api/v1/me/follow-requests"))).andExpect(jsonPath("$.items", hasSize(0)));
        mvc.perform(as(dim, get("/api/v1/me/follow-requests"))).andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void refuserUneDemandeLaFaitDisparaitre() throws Exception {
        follow(dim, "lea.m");
        mvc.perform(as(lea, post("/api/v1/me/follow-requests/dim.k/decline"))).andExpect(status().isNoContent());
        mvc.perform(as(lea, get("/api/v1/me/follow-requests"))).andExpect(jsonPath("$.items", hasSize(0)));
        assertThat(count("select count(*) from follows")).isZero();
        // Il peut en renvoyer une.
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("pending"));
    }

    /** Seuls les amis voient les listes et les amis d'un profil (403 sinon). */
    @Test
    void seulsLesAmisVoientListesEtAmis() throws Exception {
        befriend(max, "max.dubois", lea, "lea.m");
        follow(dim, "lea.m");

        mvc.perform(as(dim, get("/api/v1/users/lea.m")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followState").value("pending"))
                .andExpect(jsonPath("$.friendsCount").value(1))
                .andExpect(jsonPath("$.canSeeLists").value(false));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("private_profile"));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/friends"))).andExpect(status().isForbidden());

        // Ami : tout est visible.
        mvc.perform(as(max, get("/api/v1/users/lea.m/titles?type=movie&status=watched"))).andExpect(status().isOk());
        mvc.perform(as(max, get("/api/v1/users/lea.m/friends")))
                .andExpect(jsonPath("$.items[*].username", contains("max.dubois")));
        // Mes propres amis me sont toujours visibles.
        mvc.perform(as(lea, get("/api/v1/users/lea.m/friends"))).andExpect(status().isOk());
    }

    /** La 201e demande du jour renvoie 429. */
    @Test
    void la201eDemandeDuJourEstRefusee() throws Exception {
        db.sql("insert into follow_quota (user_id, day, count) values (:me, date '2026-10-11', 199)")
                .param("me", dim)
                .update();
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("pending"));
        follow(dim, "max.dubois")
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("follow_limit"));
        assertThat(count("select count(*) from follows where follower_id = ?", dim)).isEqualTo(1);
        // Le compteur de la veille ne compte pas.
        db.sql("update follow_quota set day = date '2026-10-10'").update();
        follow(dim, "max.dubois").andExpect(jsonPath("$.status").value("pending"));
    }

    @Test
    void retirerUnAmiPuisAnnulerRetablitLAmitieDOrigine() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        db.sql("update follows set created_at = '2026-09-01T10:00:00Z', accepted_at = '2026-09-02T10:00:00Z'").update();

        // Léa retire Dim : les deux sens disparaissent, sans prévenir personne.
        mvc.perform(as(lea, delete("/api/v1/users/dim.k/follow"))).andExpect(status().isNoContent());
        assertThat(count("select count(*) from follows")).isZero();
        assertThat(friends(dim)).isZero();
        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(jsonPath("$.followState").value("none"));

        // « Annuler » : amis de nouveau (pas une demande), avec les mêmes dates, hors limite du jour.
        follow(lea, "dim.k").andExpect(jsonPath("$.status").value("accepted"));
        assertThat(db.sql("select accepted_at from follows").query(Instant.class).list())
                .containsOnly(Instant.parse("2026-09-02T10:00:00Z"))
                .hasSize(2);
        assertThat(count("select count(*) from follow_quota where user_id = ?", lea)).isZero();
        assertThat(friends(dim)).isEqualTo(1);
        assertThat(friends(lea)).isEqualTo(1);
    }

    @Test
    void retirerUnAmiNeLuiPermetPasDeRevenirSeul() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        mvc.perform(as(lea, delete("/api/v1/users/dim.k/follow"))).andExpect(status().isNoContent());

        // Seule Léa (qui a retiré) peut annuler ; Dim doit renvoyer une demande.
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("pending"));
        assertThat(count("select count(*) from follows where status = 'accepted'")).isZero();
    }

    @Test
    void annulerUneDemandeNeLaRetablitPas() throws Exception {
        follow(dim, "lea.m");
        mvc.perform(as(dim, delete("/api/v1/users/lea.m/follow"))).andExpect(status().isNoContent());
        assertThat(count("select count(*) from follows")).isZero();
        follow(dim, "lea.m").andExpect(jsonPath("$.status").value("pending"));
    }

    @Test
    void annulerSansDemandeNeRefusePasLaSienne() throws Exception {
        follow(lea, "dim.k");
        mvc.perform(as(dim, delete("/api/v1/users/lea.m/follow"))).andExpect(status().isNoContent());
        mvc.perform(as(dim, get("/api/v1/me/follow-requests")))
                .andExpect(jsonPath("$.items[*].username", contains("lea.m")));
    }

    @Test
    void toutAccepter() throws Exception {
        follow(dim, "lea.m");
        follow(max, "lea.m");
        mvc.perform(as(lea, post("/api/v1/me/follow-requests/accept-all")))
                .andExpect(jsonPath("$.accepted").value(2));
        assertThat(friends(lea)).isEqualTo(2);
        assertThat(friends(dim)).isEqualTo(1);
        assertThat(friends(max)).isEqualTo(1);
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
    void amisPlusRecentsDAbordAvecFiltre() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        befriend(max, "max.dubois", lea, "lea.m");
        db.sql("update follows set accepted_at = '2026-10-01T00:00:00Z' where :d in (follower_id, followee_id)")
                .param("d", dim)
                .update();

        mvc.perform(as(dim, get("/api/v1/users/lea.m/friends")))
                .andExpect(jsonPath("$.items[*].username", contains("max.dubois", "dim.k")))
                .andExpect(jsonPath("$.nextCursor").doesNotExist());
        mvc.perform(as(dim, get("/api/v1/users/lea.m/friends?q=DUBO")))
                .andExpect(jsonPath("$.items[*].username", contains("max.dubois")));
        mvc.perform(as(lea, get("/api/v1/users/dim.k/friends")))
                .andExpect(jsonPath("$.items[0].username").value("lea.m"))
                .andExpect(jsonPath("$.items[0].displayName").value("Léa Martin"));
    }

    @Test
    void supprimerSonCompteMetAJourLesCompteursDesAutres() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        follow(max, "dim.k");
        WIREMOCK.stubFor(WireMock.delete(urlEqualTo("/supabase/auth/v1/admin/users/" + dim))
                .willReturn(aResponse().withStatus(200)));

        mvc.perform(as(dim, delete("/api/v1/me"))).andExpect(status().isNoContent());

        assertThat(friends(lea)).isZero();
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
        assertThat(friends(lea)).isZero();
        assertThat(friends(max)).isZero();
    }

    /** Clients directs (clé Supabase) : lecture de leurs lignes seulement, aucune écriture. */
    @Test
    void laRlsInterditDeDevenirAmisSansPasserParLeBackend() throws Exception {
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
