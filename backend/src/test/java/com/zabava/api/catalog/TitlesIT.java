package com.zabava.api.catalog;

import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import com.zabava.api.IntegrationTest;

/** GET /titles/{type}/{tmdbId} et GET /titles/tv/{tmdbId}/seasons/{n}. */
class TitlesIT extends IntegrationTest {

    private UUID user;

    @BeforeEach
    void setUp() {
        stubCatalog();
        user = createUser("alice@example.com");
    }

    @Test
    void ficheFilmComplete() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/movie/603")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("movie-603"))
                .andExpect(jsonPath("$.type").value("movie"))
                .andExpect(jsonPath("$.title").value("L'Odyssée"))
                .andExpect(jsonPath("$.year").value(2026))
                .andExpect(jsonPath("$.runtime").value(170))
                .andExpect(jsonPath("$.genres", contains("Aventure", "Fantastique")))
                .andExpect(jsonPath("$.certification").value("13+"))
                .andExpect(jsonPath("$.originalLanguage").value("Anglais"))
                .andExpect(jsonPath("$.country").value("États-Unis"))
                .andExpect(jsonPath("$.studio").value("Universal Pictures"))
                // Région du profil : Canada.
                .andExpect(jsonPath("$.releaseTheatrical").value("2026-10-20"))
                .andExpect(jsonPath("$.releaseDigital").value("2026-12-18"))
                .andExpect(jsonPath("$.availability.sub[0].name").value("Netflix"))
                .andExpect(jsonPath("$.availability.sub[0].shortName").value("N"))
                .andExpect(jsonPath("$.availability.rent[0].name").value("Apple TV"))
                .andExpect(jsonPath("$.availability.buy", hasSize(0)))
                .andExpect(jsonPath("$.availability.link").value("https://www.themoviedb.org/movie/603/watch?locale=CA"))
                // Notes OMDb.
                .andExpect(jsonPath("$.imdbRating").value(8.5))
                .andExpect(jsonPath("$.imdbVotes").value(640312))
                .andExpect(jsonPath("$.rtScore").value(92))
                // Bande-annonce dans la langue de l'utilisateur d'abord.
                .andExpect(jsonPath("$.trailerKey").value("fr-trailer"))
                .andExpect(jsonPath("$.cast[1].name").value("Zendaya"))
                .andExpect(jsonPath("$.crew.directors", contains("Christopher Nolan")))
                .andExpect(jsonPath("$.crew.writers", contains("Christopher Nolan")))
                // Saga : autres volets, triés par date.
                .andExpect(jsonPath("$.collection.parts[*].id", contains("movie-602", "movie-604")))
                // Similaires : même type, sans doublon.
                .andExpect(jsonPath("$.similar[*].id", contains("movie-700", "movie-701")))
                .andExpect(jsonPath("$.userTitle").doesNotExist());
    }

    @Test
    void ficheGardeeEnBase() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/movie/603"))).andExpect(status().isOk());

        assertThat(db.sql("select imdb_id from titles where media_type = 'movie' and tmdb_id = 603")
                        .query(String.class).single())
                .isEqualTo("tt0133093");
        assertThat(db.sql("select count(*) from release_dates").query(Long.class).single()).isEqualTo(3);
        // Offres de toutes les régions, dont la France.
        assertThat(db.sql("select count(*) from title_availability where region = 'FR'").query(Long.class).single())
                .isEqualTo(1);
        assertThat(db.sql("select name from providers where id = 8").query(String.class).single()).isEqualTo("Netflix");
        // Offres déjà là quand le titre entre en base : connues « depuis toujours », pas des arrivées.
        assertThat(db.sql("select count(*) from title_availability where first_seen_at > '2000-01-01'")
                        .query(Long.class).single())
                .isZero();
    }

    @Test
    void ficheFraicheLueSansAucuneEcriture() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/movie/603"))).andExpect(status().isOk());
        db.sql("delete from title_availability").update();
        db.sql("update titles set title = 'Titre en base' where tmdb_id = 603").update();

        // Enregistrée il y a moins de 24 h : la fiche répond sans rien réécrire.
        mvc.perform(as(user, get("/api/v1/titles/movie/603")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availability.sub[0].name").value("Netflix"));
        assertThat(db.sql("select count(*) from title_availability").query(Long.class).single()).isZero();
        assertThat(db.sql("select title from titles where tmdb_id = 603").query(String.class).single())
                .isEqualTo("Titre en base");
    }

    @Test
    void fichePerimeeReecriteEnGardantLaDateDArriveeDesOffres() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/movie/603"))).andExpect(status().isOk());
        // Offre Netflix arrivée le 1er mai ; une offre disparue depuis chez TMDB ; un titre enregistré il y a 2 jours.
        db.sql("update title_availability set first_seen_at = '2026-05-01T00:00:00Z' where region = 'CA' and provider_id = 8")
                .update();
        long titleId = db.sql("select id from titles where tmdb_id = 603").query(Long.class).single();
        db.sql("insert into title_availability (title_id, region, provider_id, type) values (:id, 'US', 999, 'abonnement')")
                .param("id", titleId)
                .update();
        db.sql("update titles set updated_at = :old where id = :id")
                .param("old", java.sql.Timestamp.from(NOW.minus(java.time.Duration.ofDays(2))))
                .param("id", titleId)
                .update();

        mvc.perform(as(user, get("/api/v1/titles/movie/603"))).andExpect(status().isOk());

        assertThat(db.sql("""
                        select count(*) from title_availability
                        where region = 'CA' and provider_id = 8 and first_seen_at = '2026-05-01T00:00:00Z'
                        """).query(Long.class).single())
                .isEqualTo(1);
        // Région proposée absente de la réponse TMDB : ses anciennes offres sont retirées.
        assertThat(db.sql("select count(*) from title_availability where provider_id = 999").query(Long.class).single())
                .isZero();
    }

    @Test
    void seulesLesRegionsProposeesSontEnregistrees() throws Exception {
        WIREMOCK.stubFor(com.github.tomakehurst.wiremock.client.WireMock.get(urlPathEqualTo("/tmdb/movie/605"))
                .willReturn(com.github.tomakehurst.wiremock.client.WireMock.okJson("""
                        {"id": 605, "title": "Ailleurs", "release_date": "2026-01-02",
                         "release_dates": {"results": [
                           {"iso_3166_1": "CA", "release_dates": [{"type": 3, "release_date": "2026-01-02T00:00:00.000Z"}]},
                           {"iso_3166_1": "DE", "release_dates": [{"type": 3, "release_date": "2026-01-05T00:00:00.000Z"}]}]},
                         "watch/providers": {"results": {
                           "CA": {"link": "https://tmdb/ca", "flatrate": [{"provider_id": 8, "provider_name": "Netflix"}]},
                           "DE": {"link": "https://tmdb/de", "flatrate": [{"provider_id": 8, "provider_name": "Netflix"}]}}}}
                        """)));

        mvc.perform(as(user, get("/api/v1/titles/movie/605"))).andExpect(status().isOk());

        assertThat(db.sql("select region from title_availability").query(String.class).list()).containsExactly("CA");
        assertThat(db.sql("select region from release_dates").query(String.class).list()).containsExactly("CA");
    }

    @Test
    void ficheSerie() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/tv/1399")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("tv-1399"))
                .andExpect(jsonPath("$.status").value("En cours"))
                .andExpect(jsonPath("$.ended").value(false))
                .andExpect(jsonPath("$.network").value("FX"))
                .andExpect(jsonPath("$.runtime").value(32))
                .andExpect(jsonPath("$.certification").value("16+"))
                .andExpect(jsonPath("$.crew.creators", contains("Christopher Storer")))
                .andExpect(jsonPath("$.crew.creatorIds", contains(9)))
                .andExpect(jsonPath("$.seasons[*].number", contains(0, 1)))
                .andExpect(jsonPath("$.availability.sub[0].shortName").value("D+"))
                // Pas de bande-annonce YouTube : champ absent, la section est masquée.
                .andExpect(jsonPath("$.trailerKey").doesNotExist());
    }

    @Test
    void serieAnimeeJaponaiseClasseeAnime() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/tv/209867")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("anime-209867"))
                .andExpect(jsonPath("$.type").value("anime"))
                .andExpect(jsonPath("$.originalLanguage").value("Japonais"));
        assertThat(db.sql("select is_anime from titles where tmdb_id = 209867").query(Boolean.class).single()).isTrue();
    }

    @Test
    void titreInconnuRenvoie404() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/movie/404")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("not_found"));
    }

    @Test
    void ficheAvecMonSuivi() throws Exception {
        mvc.perform(as(user, post("/api/v1/me/titles"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tmdbId\": 603, \"type\": \"movie\", \"status\": \"towatch\"}"))
                .andExpect(status().isCreated());
        mvc.perform(as(user, get("/api/v1/titles/movie/603")))
                .andExpect(jsonPath("$.userTitle.titleId").value("movie-603"))
                .andExpect(jsonPath("$.userTitle.status").value("towatch"))
                .andExpect(jsonPath("$.userTitle.notificationsEnabled").value(true));
    }

    @Test
    void saisonAvecHeuresTvmazeEtEpisodesVus() throws Exception {
        WIREMOCK.stubFor(com.github.tomakehurst.wiremock.client.WireMock.get(urlPathEqualTo("/tmdb/tv/1399/season/1"))
                .willReturn(com.github.tomakehurst.wiremock.client.WireMock.okJson(
                        fixture("tmdb-tv-1399-seasons.json").replaceFirst("(?s)^.*\"season/1\": ", "").replaceFirst("(?s)}\\s*$", ""))));

        mvc.perform(as(user, get("/api/v1/titles/tv/1399/seasons/1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number").value(1))
                .andExpect(jsonPath("$.episodes", hasSize(3)))
                .andExpect(jsonPath("$.episodes[0].name").value("Système"))
                .andExpect(jsonPath("$.episodes[0].airDate").value("2026-09-01"))
                .andExpect(jsonPath("$.episodes[2].airstamp").value("2026-10-14T01:00:00Z"))
                .andExpect(jsonPath("$.episodes[0].watchedAt").doesNotExist());

        long firstEpisode = db.sql("select id from episodes where season_number = 1 and episode_number = 1")
                .query(Long.class).single();
        mvc.perform(as(user, post("/api/v1/me/episodes/watched"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"episodeIds\": [" + firstEpisode + "]}"))
                .andExpect(status().isNoContent());

        mvc.perform(as(user, get("/api/v1/titles/tv/1399/seasons/1")))
                .andExpect(jsonPath("$.episodes[0].id").value(firstEpisode))
                .andExpect(jsonPath("$.episodes[0].watchedAt").value("2026-10-11T12:00:00Z"));
        WIREMOCK.verify(1, getRequestedFor(urlPathEqualTo("/tvmaze/lookup/shows")));
    }

    @Test
    void tousLesEpisodesDUneSerieAvecMesVisionnages() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/tv/1399/episodes")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].season", contains(0, 1, 1, 1)))
                .andExpect(jsonPath("$[1].name").value("Système"))
                .andExpect(jsonPath("$[3].airstamp").value("2026-10-14T01:00:00Z"))
                .andExpect(jsonPath("$[1].watchedAt").doesNotExist());

        long firstEpisode = db.sql("select id from episodes where season_number = 1 and episode_number = 1")
                .query(Long.class).single();
        mvc.perform(as(user, post("/api/v1/me/episodes/watched"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"episodeIds\": [" + firstEpisode + "]}"))
                .andExpect(status().isNoContent());

        mvc.perform(as(user, get("/api/v1/titles/tv/1399/episodes")))
                .andExpect(jsonPath("$[1].id").value(firstEpisode))
                .andExpect(jsonPath("$[1].watchedAt").value("2026-10-11T12:00:00Z"));
        // Épisodes déjà complets en base : pas de second chargement TMDB.
        WIREMOCK.verify(1, getRequestedFor(urlPathEqualTo("/tmdb/tv/1399")).withQueryParam(
                "append_to_response", com.github.tomakehurst.wiremock.client.WireMock.matching(".*season/1.*")));
    }

    @Test
    void episodesRechargesQuandIlEnManqueParRapportAuxSaisons() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/tv/1399/episodes"))).andExpect(status().isOk());
        // Nouvel épisode annoncé : la saison en compte un de plus que la base.
        db.sql("delete from episodes where season_number = 1 and episode_number = 3").update();

        mvc.perform(as(user, get("/api/v1/titles/tv/1399/episodes")))
                .andExpect(status().isOk())
                // Sans rechargement, il n'en reviendrait que 3.
                .andExpect(jsonPath("$", hasSize(4)));
    }

    @Test
    void episodesRechargesApres24Heures() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/tv/1399/episodes"))).andExpect(status().isOk());
        // Nom provisoire en base (« Épisode 1 »), chargé il y a deux jours.
        db.sql("update episodes set name = 'Épisode 1' where season_number = 1 and episode_number = 1").update();
        db.sql("update titles set episodes_updated_at = episodes_updated_at - interval '2 days' where tmdb_id = 1399")
                .update();

        mvc.perform(as(user, get("/api/v1/titles/tv/1399/episodes")))
                .andExpect(jsonPath("$[1].name").value("Système"));
    }

    @Test
    void episodesFraisPasRecharges() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/tv/1399/episodes"))).andExpect(status().isOk());
        db.sql("update episodes set name = 'Épisode 1' where season_number = 1 and episode_number = 1").update();

        // Chargés il y a moins de 24 h : la base fait foi.
        mvc.perform(as(user, get("/api/v1/titles/tv/1399/episodes")))
                .andExpect(jsonPath("$[1].name").value("Épisode 1"));
    }

    @Test
    void episodesDUnFilmRenvoie400() throws Exception {
        mvc.perform(as(user, get("/api/v1/titles/movie/603/episodes"))).andExpect(status().isBadRequest());
    }
}
