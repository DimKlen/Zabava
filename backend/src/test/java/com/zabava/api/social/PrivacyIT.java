package com.zabava.api.social;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Revue de confidentialité (specs/social/etapes/07 §5, amis réciproques) : chaque endpoint de
 * lecture, vu par dim, avec un compte qui n'est pas son ami, un compte que dim a bloqué et un compte
 * qui a bloqué dim. Aucune donnée de leurs listes ne doit sortir, même indirectement (titres en
 * commun, fil, fiches, amis d'un tiers).
 */
class PrivacyIT extends SocialTest {

    private UUID dim;
    private UUID lea;
    private UUID other;
    private UUID blocker;

    @BeforeEach
    void setUp() throws Exception {
        stubCatalog();
        dim = member("dim.k", "Dim");
        lea = member("lea.m", "Léa");
        other = member("autre.a", "Autre");
        UUID blocked = member("bloque.b", "Bloqué");
        blocker = member("bloqueur.b", "Bloqueur");
        // Tous ont vu le même film que dim : un titre en commun si rien n'était filtré.
        for (UUID u : new UUID[] {dim, lea, other, blocked, blocker}) addTitle(u, 603, "movie", "watched");
        // Avant blocage : amis de Léa, pour vérifier qu'ils disparaissent de ses amis vus par dim.
        befriend(other, "autre.a", lea, "lea.m");
        befriend(blocked, "bloque.b", lea, "lea.m");
        befriend(blocker, "bloqueur.b", lea, "lea.m");
        befriend(dim, "dim.k", lea, "lea.m");
        mvc.perform(as(dim, post("/api/v1/users/bloque.b/block"))).andExpect(status().isNoContent());
        mvc.perform(as(blocker, post("/api/v1/users/dim.k/block"))).andExpect(status().isNoContent());
    }

    @Test
    void pasAmiEnteteSeulement() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/autre.a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canSeeLists").value(false))
                // Les titres en commun révéleraient sa liste.
                .andExpect(jsonPath("$.commonCount").value(0));
        mvc.perform(as(dim, get("/api/v1/users/autre.a/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden());
        mvc.perform(as(dim, get("/api/v1/users/autre.a/friends"))).andExpect(status().isForbidden());
        // Dans la recherche aussi : visible, sans titres en commun.
        mvc.perform(as(dim, get("/api/v1/users/search?q=autre")))
                .andExpect(jsonPath("$.items[0].username").value("autre.a"))
                .andExpect(jsonPath("$.items[0].commonCount").value(0));
    }

    @Test
    void amiToutEstVisible() throws Exception {
        befriend(dim, "dim.k", other, "autre.a");
        mvc.perform(as(dim, get("/api/v1/users/autre.a")))
                .andExpect(jsonPath("$.canSeeLists").value(true))
                .andExpect(jsonPath("$.commonCount").value(1));
        mvc.perform(as(dim, get("/api/v1/users/autre.a/titles?type=movie&status=watched")))
                .andExpect(status().isOk());
    }

    @Test
    void uneDemandeEnvoyeeNeDonneAccesARien() throws Exception {
        follow(dim, "autre.a");
        mvc.perform(as(dim, get("/api/v1/users/autre.a")))
                .andExpect(jsonPath("$.canSeeLists").value(false))
                .andExpect(jsonPath("$.commonCount").value(0));
        mvc.perform(as(dim, get("/api/v1/users/autre.a/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden());
        // Ni dans l'autre sens : recevoir une demande ne montre pas les listes du demandeur.
        mvc.perform(as(other, get("/api/v1/users/dim.k/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden());
    }

    @Test
    void compteQueJAiBloqueSansListes() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/bloque.b")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.followState").value("blocked"))
                .andExpect(jsonPath("$.canSeeLists").value(false))
                .andExpect(jsonPath("$.commonCount").value(0));
        mvc.perform(as(dim, get("/api/v1/users/bloque.b/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden());
        mvc.perform(as(dim, get("/api/v1/users/bloque.b/friends"))).andExpect(status().isForbidden());
    }

    @Test
    void compteQuiMABloqueIntrouvablePartout() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/bloqueur.b"))).andExpect(status().isNotFound());
        mvc.perform(as(dim, get("/api/v1/users/bloqueur.b/titles?type=movie&status=watched")))
                .andExpect(status().isNotFound());
        mvc.perform(as(dim, get("/api/v1/users/bloqueur.b/friends"))).andExpect(status().isNotFound());
        mvc.perform(as(dim, post("/api/v1/me/recent-profiles/bloqueur.b"))).andExpect(status().isNotFound());
    }

    @Test
    void rechercheSansComptesBloquesDansUnSensOuDansLAutre() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/search?q=bloque")))
                .andExpect(jsonPath("$.items[*].username", not(hasItem("bloque.b"))))
                .andExpect(jsonPath("$.items[*].username", not(hasItem("bloqueur.b"))));
    }

    @Test
    void amisDUnTiersSansComptesBloques() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/lea.m/friends")))
                .andExpect(jsonPath("$.items[*].username", hasItem("autre.a")))
                .andExpect(jsonPath("$.items[*].username", not(hasItem("bloque.b"))))
                .andExpect(jsonPath("$.items[*].username", not(hasItem("bloqueur.b"))))
                // Un ami de Léa qui n'est pas le mien apparaît, sans titres en commun.
                .andExpect(jsonPath("$.items[?(@.username == 'autre.a')].commonCount", everyItem(is(0))));
    }

    @Test
    void ficheAvecMesAmisSeulement() throws Exception {
        mvc.perform(as(dim, get("/api/v1/titles/movie/603/social")))
                .andExpect(jsonPath("$.following[*].user.username", contains("lea.m")))
                .andExpect(jsonPath("$.saw").doesNotExist());
    }

    @Test
    void filAvecMesAmisSeulement() throws Exception {
        mvc.perform(as(dim, get("/api/v1/me/feed")))
                .andExpect(jsonPath("$.items[*].actor.username", everyItem(is("lea.m"))))
                .andExpect(jsonPath("$.items[*].type", not(hasItem("followed"))));
    }

    @Test
    void profilsVisitesSansComptesBloques() throws Exception {
        mvc.perform(as(dim, post("/api/v1/me/recent-profiles/autre.a"))).andExpect(status().isOk());
        // Visité puis bloqué : il disparaît de la liste.
        mvc.perform(as(dim, post("/api/v1/me/recent-profiles/lea.m"))).andExpect(status().isOk());
        mvc.perform(as(lea, post("/api/v1/users/dim.k/block"))).andExpect(status().isNoContent());
        mvc.perform(as(dim, get("/api/v1/me/recent-profiles")))
                .andExpect(jsonPath("$[*].username", not(hasItem("lea.m"))))
                .andExpect(jsonPath("$[?(@.username == 'autre.a')].commonCount", everyItem(is(0))));
    }
}
