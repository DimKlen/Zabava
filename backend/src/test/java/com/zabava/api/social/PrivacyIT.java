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
 * lecture, vu par dim, avec un compte qui n'est pas son ami. Aucune donnée de ses listes ne doit
 * sortir, même indirectement (titres en commun, fil, fiches).
 */
class PrivacyIT extends SocialTest {

    private UUID dim;
    private UUID lea;
    private UUID other;

    @BeforeEach
    void setUp() throws Exception {
        stubCatalog();
        dim = member("dim.k", "Dim");
        lea = member("lea.m", "Léa");
        other = member("autre.a", "Autre");
        // Tous ont vu le même film que dim : un titre en commun si rien n'était filtré.
        for (UUID u : new UUID[] {dim, lea, other}) addTitle(u, 603, "movie", "watched");
        befriend(other, "autre.a", lea, "lea.m");
        befriend(dim, "dim.k", lea, "lea.m");
    }

    @Test
    void pasAmiEnteteSeulement() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/autre.a")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canSeeLists").value(false))
                // Les titres en commun révéleraient sa liste.
                .andExpect(jsonPath("$.commonCount").value(0));
        mvc.perform(as(dim, get("/api/v1/users/autre.a/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("private_profile"));
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
    void amisDUnAmiSansTitresEnCommun() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/lea.m/friends")))
                .andExpect(jsonPath("$.items[*].username", hasItem("autre.a")))
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
    void profilsVisitesSansTitresEnCommunDesNonAmis() throws Exception {
        mvc.perform(as(dim, post("/api/v1/me/recent-profiles/autre.a"))).andExpect(status().isOk());
        mvc.perform(as(dim, get("/api/v1/me/recent-profiles")))
                .andExpect(jsonPath("$[*].username", contains("autre.a")))
                .andExpect(jsonPath("$[?(@.username == 'autre.a')].commonCount", everyItem(is(0))));
    }
}
