package com.zabava.api.social;

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
 * Revue de confidentialité (specs/social/etapes/07 §5) : chaque endpoint de lecture, vu par dim, avec
 * un compte privé non suivi, un compte que dim a bloqué et un compte qui a bloqué dim. Aucune donnée
 * de leurs listes ne doit sortir, même indirectement (titres en commun, fil, fiches, listes d'un tiers).
 */
class PrivacyIT extends SocialTest {

    private UUID dim;
    private UUID lea;
    private UUID priv;
    private UUID blocked;
    private UUID blocker;

    @BeforeEach
    void setUp() throws Exception {
        stubCatalog();
        dim = member("dim.k", "Dim");
        lea = member("lea.m", "Léa");
        priv = member("prive.p", "Privé");
        blocked = member("bloque.b", "Bloqué");
        blocker = member("bloqueur.b", "Bloqueur");
        // Tous ont vu le même film que dim : un titre en commun si rien n'était filtré.
        for (UUID u : new UUID[] {dim, lea, priv, blocked, blocker}) addTitle(u, 603, "movie", "watched");
        // Avant blocage : liens croisés, pour vérifier qu'ils disparaissent des listes de Léa.
        for (UUID u : new UUID[] {priv, blocked, blocker}) {
            follow(lea, usernameOf(u));
            follow(u, "lea.m");
        }
        follow(dim, "lea.m");
        makePrivate(priv);
        mvc.perform(as(dim, post("/api/v1/users/bloque.b/block"))).andExpect(status().isNoContent());
        mvc.perform(as(blocker, post("/api/v1/users/dim.k/block"))).andExpect(status().isNoContent());
    }

    private String usernameOf(UUID id) {
        return db.sql("select username from profiles where id = :id").param("id", id).query(String.class).single();
    }

    @Test
    void profilPriveNonSuiviEnteteSeulement() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/prive.p")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.canSeeLists").value(false))
                // Les titres en commun révéleraient sa liste.
                .andExpect(jsonPath("$.commonCount").value(0));
        mvc.perform(as(dim, get("/api/v1/users/prive.p/titles?type=movie&status=watched")))
                .andExpect(status().isForbidden());
        mvc.perform(as(dim, get("/api/v1/users/prive.p/followers"))).andExpect(status().isForbidden());
        mvc.perform(as(dim, get("/api/v1/users/prive.p/following"))).andExpect(status().isForbidden());
        // Dans la recherche aussi : visible, sans titres en commun.
        mvc.perform(as(dim, get("/api/v1/users/search?q=prive")))
                .andExpect(jsonPath("$.items[0].username").value("prive.p"))
                .andExpect(jsonPath("$.items[0].commonCount").value(0));
    }

    @Test
    void profilPriveSuiviToutEstVisible() throws Exception {
        follow(dim, "prive.p");
        mvc.perform(as(priv, post("/api/v1/me/follow-requests/dim.k/accept"))).andExpect(status().isNoContent());
        mvc.perform(as(dim, get("/api/v1/users/prive.p")))
                .andExpect(jsonPath("$.canSeeLists").value(true))
                .andExpect(jsonPath("$.commonCount").value(1));
        mvc.perform(as(dim, get("/api/v1/users/prive.p/titles?type=movie&status=watched")))
                .andExpect(status().isOk());
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
        mvc.perform(as(dim, get("/api/v1/users/bloque.b/followers"))).andExpect(status().isForbidden());
    }

    @Test
    void compteQuiMABloqueIntrouvablePartout() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/bloqueur.b"))).andExpect(status().isNotFound());
        mvc.perform(as(dim, get("/api/v1/users/bloqueur.b/titles?type=movie&status=watched")))
                .andExpect(status().isNotFound());
        mvc.perform(as(dim, get("/api/v1/users/bloqueur.b/followers"))).andExpect(status().isNotFound());
        mvc.perform(as(dim, get("/api/v1/users/bloqueur.b/following"))).andExpect(status().isNotFound());
        mvc.perform(as(dim, post("/api/v1/me/recent-profiles/bloqueur.b"))).andExpect(status().isNotFound());
    }

    @Test
    void rechercheSansComptesBloquesDansUnSensOuDansLAutre() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/search?q=bloque")))
                .andExpect(jsonPath("$.items[*].username", not(hasItem("bloque.b"))))
                .andExpect(jsonPath("$.items[*].username", not(hasItem("bloqueur.b"))));
    }

    @Test
    void listesDUnTiersSansComptesBloques() throws Exception {
        for (String kind : new String[] {"followers", "following"}) {
            mvc.perform(as(dim, get("/api/v1/users/lea.m/" + kind)))
                    .andExpect(jsonPath("$.items[*].username", hasItem("prive.p")))
                    .andExpect(jsonPath("$.items[*].username", not(hasItem("bloque.b"))))
                    .andExpect(jsonPath("$.items[*].username", not(hasItem("bloqueur.b"))))
                    // Le profil privé apparaît (son en-tête est public), sans titres en commun.
                    .andExpect(jsonPath("$.items[?(@.username == 'prive.p')].commonCount", everyItem(is(0))));
        }
    }

    @Test
    void ficheSansProfilsPrivesNiBloques() throws Exception {
        mvc.perform(as(dim, get("/api/v1/titles/movie/603/social")))
                .andExpect(jsonPath("$.following[*].user.username", not(hasItem("prive.p"))))
                .andExpect(jsonPath("$.saw[*].user.username", not(hasItem("prive.p"))))
                .andExpect(jsonPath("$.saw[*].user.username", not(hasItem("bloque.b"))))
                .andExpect(jsonPath("$.saw[*].user.username", not(hasItem("bloqueur.b"))));
    }

    @Test
    void filSansActivitesNiCiblesInterdites() throws Exception {
        // Léa est suivie : ses « suit maintenant » vers les comptes bloqués ne doivent pas sortir.
        mvc.perform(as(dim, get("/api/v1/me/feed")))
                .andExpect(jsonPath("$.items[*].actor.username", everyItem(is("lea.m"))))
                .andExpect(jsonPath("$.items[*].target.username", not(hasItem("bloque.b"))))
                .andExpect(jsonPath("$.items[*].target.username", not(hasItem("bloqueur.b"))));
    }

    @Test
    void profilsVisitesSansComptesBloques() throws Exception {
        mvc.perform(as(dim, post("/api/v1/me/recent-profiles/prive.p"))).andExpect(status().isOk());
        // Visité puis bloqué : il disparaît de la liste.
        mvc.perform(as(dim, post("/api/v1/me/recent-profiles/lea.m"))).andExpect(status().isOk());
        mvc.perform(as(lea, post("/api/v1/users/dim.k/block"))).andExpect(status().isNoContent());
        mvc.perform(as(dim, get("/api/v1/me/recent-profiles")))
                .andExpect(jsonPath("$[*].username", not(hasItem("lea.m"))))
                .andExpect(jsonPath("$[?(@.username == 'prive.p')].commonCount", everyItem(is(0))));
    }
}
