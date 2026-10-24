package com.zabava.api.social;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;

/** Liens d'invitation ouverts sans compte : assetlinks.json et page de repli /u/{pseudo}. */
class InviteIT extends SocialTest {

    @Test
    void assetLinksSansCompte() throws Exception {
        mvc.perform(get("/.well-known/assetlinks.json"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$[0].relation[0]").value("delegate_permission/common.handle_all_urls"))
                .andExpect(jsonPath("$[0].target.namespace").value("android_app"))
                .andExpect(jsonPath("$[0].target.package_name").value("com.zabava.app"))
                .andExpect(jsonPath("$[0].target.sha256_cert_fingerprints[0]").value(
                        "6A:73:9D:0C:D3:B5:0D:EC:61:E9:2F:39:5B:04:30:0C:3F:A4:D3:92:30:26:1F:77:87:5B:01:AC:93:15:31:F6"));
    }

    @Test
    void pageDeRepliDUnProfil() throws Exception {
        member("lea.m", "Léa <Martin>");
        mvc.perform(get("/u/Lea.M"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/html"))
                .andExpect(content().string(containsString("<h1>Léa &lt;Martin&gt;</h1>")))
                .andExpect(content().string(containsString("@lea.m")))
                .andExpect(content().string(containsString("href=\"zabava://u/lea.m\">Ouvrir dans Zabava</a>")))
                .andExpect(content().string(not(containsString("<Martin>"))));
    }

    @Test
    void ancienPseudoMeneAuProfilActuel() throws Exception {
        UUID lea = member("lea.m", "Léa");
        db.sql("insert into username_history (user_id, username, released_at) values (:id, 'lea.old', :at)")
                .param("id", lea)
                .param("at", java.sql.Timestamp.from(NOW.plusSeconds(86_400)))
                .update();
        mvc.perform(get("/u/lea.old"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("href=\"zabava://u/lea.m\"")));
    }

    @Test
    void profilInconnu() throws Exception {
        for (String path : new String[] {"/u/personne", "/u/a", "/u/pas-valide"}) {
            mvc.perform(get(path))
                    .andExpect(status().isNotFound())
                    .andExpect(content().string(containsString("Ce profil n'existe pas ou n'est plus disponible")));
        }
    }
}
