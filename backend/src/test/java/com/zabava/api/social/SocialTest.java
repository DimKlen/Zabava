package com.zabava.api.social;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import com.zabava.api.IntegrationTest;

/** Outils communs des tests sociaux : membres avec pseudo, abonnements, suivi de titres. */
abstract class SocialTest extends IntegrationTest {

    /** Crée un compte avec ce pseudo et le nom affiché donné. */
    protected UUID member(String username, String displayName) {
        UUID id = createUser(username.replace(".", "").replace("_", "") + "@example.com");
        db.sql("update profiles set username = :u, display_name = :n where id = :id")
                .param("u", username)
                .param("n", displayName)
                .param("id", id)
                .update();
        return id;
    }

    protected void makePrivate(UUID id) {
        db.sql("update profiles set is_private = true where id = :id").param("id", id).update();
    }

    protected ResultActions follow(UUID me, String username) throws Exception {
        return mvc.perform(as(me, post("/api/v1/users/" + username + "/follow")));
    }

    protected MockHttpServletRequestBuilder json(UUID me, MockHttpServletRequestBuilder request, String body) {
        return as(me, request).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    /** Ajout daté de l'horloge des tests (sans date, la base prendrait l'heure réelle). */
    protected void addTitle(UUID me, int tmdbId, String type, String status) throws Exception {
        mvc.perform(json(me, post("/api/v1/me/titles"), "{\"tmdbId\": " + tmdbId + ", \"type\": \"" + type
                        + "\", \"status\": \"" + status + "\", \"addedAt\": \"" + NOW + "\"}"))
                .andExpect(status().isCreated());
    }

    protected void markEpisodes(UUID me, String watchedAt, long... ids) throws Exception {
        StringBuilder list = new StringBuilder();
        for (long id : ids) list.append(list.isEmpty() ? "" : ", ").append(id);
        String at = watchedAt == null ? "" : ", \"watchedAt\": \"" + watchedAt + "\"";
        mvc.perform(json(me, post("/api/v1/me/episodes/watched"), "{\"episodeIds\": [" + list + "]" + at + "}"))
                .andExpect(status().isNoContent());
    }

    protected long episodeId(int tmdbId, int season, int number) {
        return db.sql("""
                select e.id from episodes e join titles t on t.id = e.title_id
                where t.tmdb_id = :tmdb and e.season_number = :s and e.episode_number = :e
                """)
                .param("tmdb", tmdbId)
                .param("s", season)
                .param("e", number)
                .query(Long.class)
                .single();
    }

    /** Ajoute des épisodes déjà diffusés à une série en base (saison donnée, numéros 1 à n). */
    protected void addAiredEpisodes(int tmdbId, int season, int count) {
        for (int n = 1; n <= count; n++) {
            db.sql("""
                    insert into episodes (title_id, season_number, episode_number, name, air_date)
                    select id, :s, :n, :name, date '2026-08-01' from titles where tmdb_id = :tmdb and media_type = 'tv'
                    """)
                    .param("s", season)
                    .param("n", n)
                    .param("name", "Épisode " + n)
                    .param("tmdb", tmdbId)
                    .update();
        }
    }

    protected long count(String sql, Object... params) {
        var spec = db.sql(sql);
        for (Object param : params) spec = spec.param(param);
        return spec.query(Long.class).single();
    }
}
