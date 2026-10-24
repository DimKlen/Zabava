package com.zabava.api.social;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Pseudos, recherche, listes d'un profil, titres en commun, blocs des fiches, profils visités. */
class UserIT extends SocialTest {

    private UUID dim;
    private UUID lea;

    @BeforeEach
    void setUp() {
        stubCatalog();
        dim = member("dim.k", "Dim");
        lea = member("lea.m", "Léa Martin");
    }

    // ─── Pseudos ──────────────────────────────────────────────────────────────

    @Test
    void disponibiliteDUnPseudo() throws Exception {
        mvc.perform(as(dim, get("/api/v1/users/username-available?u=eloise")))
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.suggestions", hasSize(0)));
        mvc.perform(as(dim, get("/api/v1/users/username-available?u=dim.k"))).andExpect(jsonPath("$.available").value(true));
        mvc.perform(as(dim, get("/api/v1/users/username-available?u=Lea")))
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.reason").value("invalid"));
        mvc.perform(as(dim, get("/api/v1/users/username-available?u=admin")))
                .andExpect(jsonPath("$.reason").value("reserved"))
                .andExpect(jsonPath("$.suggestions", contains("admin.tv", "admin_26", "admin.zab")));
        member("lea.m.tv", "Autre Léa");
        mvc.perform(as(dim, get("/api/v1/users/username-available?u=lea.m")))
                .andExpect(jsonPath("$.reason").value("taken"))
                .andExpect(jsonPath("$.suggestions", contains("lea.m_26", "lea.m.zab", "lea.m2")));
    }

    @Test
    void changerDePseudoUneFoisTousLes30Jours() throws Exception {
        UUID nouveau = createUser("nouveau@example.com");
        // Premier choix (onboarding) : ne compte pas comme un changement.
        mvc.perform(json(nouveau, put("/api/v1/me/profile"),
                        "{\"username\": \"eloise\", \"isPrivate\": true, \"onboardedAt\": \"" + NOW + "\"}"))
                .andExpect(jsonPath("$.username").value("eloise"))
                .andExpect(jsonPath("$.isPrivate").value(true))
                .andExpect(jsonPath("$.usernameChangedAt").doesNotExist());
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise.b\"}"))
                .andExpect(jsonPath("$.username").value("eloise.b"))
                .andExpect(jsonPath("$.usernameChangedAt").value("2026-10-11T12:00:00Z"));
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise.c\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error.code").value("username_change_too_soon"))
                .andExpect(jsonPath("$.error.nextChangeAt").value("2026-11-10T12:00:00Z"));

        // L'ancien pseudo reste réservé et son lien mène au nouveau profil.
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"username\": \"eloise\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("username_taken"));
        mvc.perform(as(dim, get("/api/v1/users/eloise"))).andExpect(jsonPath("$.username").value("eloise.b"));
    }

    @Test
    void pendantLOnboardingChangerDePseudoEstLibre() throws Exception {
        UUID nouveau = createUser("nouveau@example.com");
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise\"}"));
        // Retour à l'étape du pseudo : ni délai de 30 jours ni ancien pseudo réservé.
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise.b\"}"))
                .andExpect(jsonPath("$.usernameChangedAt").doesNotExist());
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise.c\"}"))
                .andExpect(status().isOk());
        mvc.perform(as(dim, get("/api/v1/users/username-available?u=eloise"))).andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void pseudoInvalideOuPris() throws Exception {
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"username\": \"Dim K\"}"))
                .andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.error.code").value("username_invalid"));
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"username\": \"support\"}"))
                .andExpect(status().isUnprocessableContent());
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"username\": \"lea.m\"}")).andExpect(status().isConflict());
    }

    @Test
    void nomAfficheEtPhoto() throws Exception {
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"displayName\": \"  Dimitri K.  \"}"))
                .andExpect(jsonPath("$.displayName").value("Dimitri K."));
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"displayName\": \"   \"}")).andExpect(status().isBadRequest());
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"avatarUrl\": \"https://pistage.example.com/x.jpg\"}"))
                .andExpect(status().isBadRequest());
        String storage = WIREMOCK.baseUrl() + "/supabase/storage/v1/object/public/avatars/" + dim + ".jpg";
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"avatarUrl\": \"" + storage + "\"}"))
                .andExpect(jsonPath("$.avatarUrl").value(storage));
        // Vide : retour à la photo du compte (absente dans le JWT de test).
        mvc.perform(json(dim, put("/api/v1/me/profile"), "{\"avatarUrl\": \"\"}"))
                .andExpect(jsonPath("$.avatarUrl").doesNotExist());
    }

    // ─── Recherche ────────────────────────────────────────────────────────────

    @Test
    void rechercheParPrefixeSansAccentsNiCasse() throws Exception {
        member("leandre", "Léandre Roy");
        member("eloise.b", "Éloïse Bouchard");
        mvc.perform(as(dim, get("/api/v1/users/search?q=@lea")))
                .andExpect(jsonPath("$.items[*].username", contains("lea.m", "leandre")));
        mvc.perform(as(dim, get("/api/v1/users/search?q=ELOI")))
                .andExpect(jsonPath("$.items[*].username", contains("eloise.b")));
        mvc.perform(as(dim, get("/api/v1/users/search?q=bouch")))
                .andExpect(jsonPath("$.items[*].username", contains("eloise.b")));
        mvc.perform(as(dim, get("/api/v1/users/search?q=l"))).andExpect(jsonPath("$.items", hasSize(0)));
        // Jamais moi.
        mvc.perform(as(dim, get("/api/v1/users/search?q=dim"))).andExpect(jsonPath("$.items", hasSize(0)));
    }

    @Test
    void rechercheExactPuisSuivisParMesAbonnements() throws Exception {
        UUID max = member("max.dubois", "Max Dubois");
        member("leandre", "Léandre Roy");
        member("lea", "Léa Tremblay");
        follow(dim, "max.dubois");
        follow(max, "leandre");
        mvc.perform(as(dim, get("/api/v1/users/search?q=lea")))
                .andExpect(jsonPath("$.items[*].username", contains("lea", "leandre", "lea.m")));
    }

    // ─── Listes d'un profil ───────────────────────────────────────────────────

    @Test
    void listesDUnProfilAvecProgressionEtCoche() throws Exception {
        addTitle(lea, 603, "movie", "watched");
        addTitle(lea, 1399, "tv", "following");
        markEpisodes(lea, null, episodeId(1399, 1, 1));
        addTitle(lea, 209867, "anime", "following");
        addTitle(dim, 603, "movie", "towatch");

        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=watched")))
                .andExpect(jsonPath("$.items[0].title.id").value("movie-603"))
                .andExpect(jsonPath("$.items[0].inMyList").value(true));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=towatch")))
                .andExpect(jsonPath("$.items", hasSize(0)));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=tv&status=in_progress")))
                .andExpect(jsonPath("$.items[*].title.id", contains("tv-1399")))
                .andExpect(jsonPath("$.items[0].lastEpisode.season").value(1))
                .andExpect(jsonPath("$.items[0].lastEpisode.number").value(1))
                .andExpect(jsonPath("$.items[0].progressPct").value(50))
                .andExpect(jsonPath("$.items[0].inMyList").value(false));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=anime&status=towatch")))
                .andExpect(jsonPath("$.items[*].title.id", contains("anime-209867")));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=tv&status=towatch")))
                .andExpect(jsonPath("$.items", hasSize(0)));
        mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=in_progress")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void lesSeriesAbandonneesNeSontPasMontrees() throws Exception {
        addTitle(lea, 1399, "tv", "abandoned");
        for (String s : new String[] {"in_progress", "finished", "towatch"}) {
            mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=tv&status=" + s)))
                    .andExpect(jsonPath("$.items", hasSize(0)));
        }
    }

    @Test
    void titresEnCommun() throws Exception {
        addTitle(dim, 603, "movie", "watched");
        addTitle(lea, 603, "movie", "watched");
        addTitle(dim, 1399, "tv", "following");
        addTitle(lea, 1399, "tv", "following");
        markEpisodes(dim, null, episodeId(1399, 1, 1));
        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(jsonPath("$.commonCount").value(1));
        // Une série en commun compte dès qu'un épisode est vu des deux côtés ; « à voir » ne compte pas.
        markEpisodes(lea, null, episodeId(1399, 1, 2));
        mvc.perform(as(dim, get("/api/v1/users/lea.m"))).andExpect(jsonPath("$.commonCount").value(2));
    }

    // ─── Blocs des fiches ─────────────────────────────────────────────────────

    @Test
    void blocsSociauxDUneFiche() throws Exception {
        UUID max = member("max.dubois", "Max Dubois");
        UUID sarah = member("sarah.l", "Sarah Lefebvre");
        UUID camille = member("camille.r", "Camille Roy");
        makePrivate(camille);
        addTitle(dim, 603, "movie", "towatch");
        addTitle(lea, 603, "movie", "watched");
        addTitle(max, 603, "movie", "towatch");
        addTitle(sarah, 603, "movie", "watched");
        addTitle(camille, 603, "movie", "watched");
        db.sql("update user_titles set added_at = '2026-10-01T00:00:00Z' where user_id = :m").param("m", max).update();
        follow(dim, "max.dubois");

        mvc.perform(as(dim, get("/api/v1/titles/movie/603/social")))
                .andExpect(jsonPath("$.following[*].user.username", contains("max.dubois")))
                .andExpect(jsonPath("$.following[0].status").value("towatch"))
                // Profils publics qui l'ont vu, hors mes abonnements et les profils privés.
                .andExpect(jsonPath("$.saw[*].user.username", contains("lea.m", "sarah.l")))
                // Avec leur statut, pour passer dans « Tes abonnements » dès qu'on les suit.
                .andExpect(jsonPath("$.saw[0].status").value("watched"))
                .andExpect(jsonPath("$.saw[0].date").value("2026-10-11T12:00:00Z"));

        follow(dim, "lea.m");
        mvc.perform(as(dim, get("/api/v1/titles/movie/603/social")))
                .andExpect(jsonPath("$.following[*].user.username", contains("lea.m", "max.dubois")))
                .andExpect(jsonPath("$.following[0].status").value("watched"))
                .andExpect(jsonPath("$.following[0].date").value("2026-10-11T12:00:00Z"))
                .andExpect(jsonPath("$.saw[*].user.username", contains("sarah.l")));
        mvc.perform(as(dim, get("/api/v1/titles/movie/999/social")))
                .andExpect(jsonPath("$.following", hasSize(0)))
                .andExpect(jsonPath("$.saw", hasSize(0)));
    }

    @Test
    void statutDUneSerieDansTesAbonnements() throws Exception {
        follow(dim, "lea.m");
        addTitle(lea, 1399, "tv", "following");
        markEpisodes(lea, null, episodeId(1399, 1, 1));
        mvc.perform(as(dim, get("/api/v1/titles/tv/1399/social")))
                .andExpect(jsonPath("$.following[0].status").value("in_progress"))
                .andExpect(jsonPath("$.following[0].detail").value("S01 E01"));
    }

    // ─── Profils visités ──────────────────────────────────────────────────────

    @Test
    void cinqDerniersProfilsVisites() throws Exception {
        for (int i = 1; i <= 6; i++) member("membre" + i, "Membre " + i);
        for (int i = 1; i <= 6; i++) {
            db.sql("update recent_profile_visits set visited_at = visited_at - interval '1 minute'").update();
            mvc.perform(as(dim, post("/api/v1/me/recent-profiles/membre" + i))).andExpect(status().isOk());
        }
        mvc.perform(as(dim, post("/api/v1/me/recent-profiles/dim.k"))).andExpect(status().isOk());
        mvc.perform(as(dim, get("/api/v1/me/recent-profiles")))
                .andExpect(jsonPath("$[*].username", contains("membre6", "membre5", "membre4", "membre3", "membre2")));
        assertThat(count("select count(*) from recent_profile_visits")).isEqualTo(5);
    }
}
