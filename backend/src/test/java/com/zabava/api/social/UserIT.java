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

/** Pseudos, recherche, listes d'un ami, titres en commun, blocs des fiches, profils visités. */
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
    void lePseudoEstDefinitifApresLInscription() throws Exception {
        UUID nouveau = createUser("nouveau@example.com");
        mvc.perform(json(nouveau, put("/api/v1/me/profile"),
                        "{\"username\": \"eloise\", \"onboardedAt\": \"" + NOW + "\"}"))
                .andExpect(jsonPath("$.username").value("eloise"));
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise.b\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("username_locked"));
        // Renvoyer le même pseudo ne change rien et ne refuse rien.
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise\"}"))
                .andExpect(status().isOk());
        mvc.perform(as(nouveau, get("/api/v1/me/profile"))).andExpect(jsonPath("$.username").value("eloise"));
    }

    @Test
    void pendantLOnboardingChangerDePseudoEstLibre() throws Exception {
        UUID nouveau = createUser("nouveau@example.com");
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise\"}"));
        // Retour à l'étape du pseudo : l'ancien choix est aussitôt libre pour les autres.
        mvc.perform(json(nouveau, put("/api/v1/me/profile"), "{\"username\": \"eloise.b\"}"))
                .andExpect(jsonPath("$.username").value("eloise.b"));
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
    void nomEtPhotoDuCompteNonModifiables() throws Exception {
        db.sql("update profiles set avatar_url = 'https://oauth.example.com/dim.jpg' where id = :id").param("id", dim).update();
        mvc.perform(json(dim, put("/api/v1/me/profile"),
                        "{\"displayName\": \"Autre nom\", \"avatarUrl\": \"https://pistage.example.com/x.jpg\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Dim"))
                .andExpect(jsonPath("$.avatarUrl").value("https://oauth.example.com/dim.jpg"));
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
    void rechercheExactPuisAmisEnCommun() throws Exception {
        UUID max = member("max.dubois", "Max Dubois");
        UUID leandre = member("leandre", "Léandre Roy");
        member("lea", "Léa Tremblay");
        befriend(dim, "dim.k", max, "max.dubois");
        befriend(max, "max.dubois", leandre, "leandre");
        mvc.perform(as(dim, get("/api/v1/users/search?q=lea")))
                .andExpect(jsonPath("$.items[*].username", contains("lea", "leandre", "lea.m")));
    }

    // ─── Listes d'un profil ───────────────────────────────────────────────────

    @Test
    void listesDUnAmiAvecProgressionEtCoche() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
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
    void maNoteEtMonCommentaireRestentPrives() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        mvc.perform(json(lea, post("/api/v1/me/titles"), """
                        {"tmdbId": 603, "type": "movie", "status": "watched", "addedAt": "%s",
                         "review": {"rating": 9, "comment": "Mon avis"}}
                        """.formatted(NOW)))
                .andExpect(status().isCreated());

        String body = mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=movie&status=watched")))
                .andExpect(jsonPath("$.items[0].title.id").value("movie-603"))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("Mon avis").doesNotContain("rating");
        String social = mvc.perform(as(dim, get("/api/v1/titles/movie/603/social")))
                .andReturn().getResponse().getContentAsString();
        assertThat(social).doesNotContain("Mon avis").doesNotContain("\"rating\"");
        // Ma propre fiche : ni la note de Léa, ni de note à moi.
        mvc.perform(as(dim, get("/api/v1/titles/movie/603"))).andExpect(jsonPath("$.userTitle").doesNotExist());
    }

    @Test
    void lesSeriesAbandonneesNeSontPasMontrees() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
        addTitle(lea, 1399, "tv", "abandoned");
        for (String s : new String[] {"in_progress", "finished", "towatch"}) {
            mvc.perform(as(dim, get("/api/v1/users/lea.m/titles?type=tv&status=" + s)))
                    .andExpect(jsonPath("$.items", hasSize(0)));
        }
    }

    @Test
    void titresEnCommun() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
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
        addTitle(dim, 603, "movie", "towatch");
        addTitle(lea, 603, "movie", "watched");
        addTitle(max, 603, "movie", "towatch");
        addTitle(sarah, 603, "movie", "watched");
        db.sql("update user_titles set added_at = '2026-10-01T00:00:00Z' where user_id = :m").param("m", max).update();
        befriend(dim, "dim.k", max, "max.dubois");
        // Une demande envoyée ne suffit pas : Sarah n'est pas encore mon amie.
        follow(dim, "sarah.l");

        mvc.perform(as(dim, get("/api/v1/titles/movie/603/social")))
                .andExpect(jsonPath("$.following[*].user.username", contains("max.dubois")))
                .andExpect(jsonPath("$.following[0].status").value("towatch"))
                .andExpect(jsonPath("$.saw").doesNotExist());

        befriend(dim, "dim.k", lea, "lea.m");
        mvc.perform(as(dim, get("/api/v1/titles/movie/603/social")))
                .andExpect(jsonPath("$.following[*].user.username", contains("lea.m", "max.dubois")))
                .andExpect(jsonPath("$.following[0].status").value("watched"))
                .andExpect(jsonPath("$.following[0].date").value("2026-10-11T12:00:00Z"));
        mvc.perform(as(dim, get("/api/v1/titles/movie/999/social")))
                .andExpect(jsonPath("$.following", hasSize(0)));
    }

    @Test
    void statutDUneSerieChezMesAmis() throws Exception {
        befriend(dim, "dim.k", lea, "lea.m");
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
