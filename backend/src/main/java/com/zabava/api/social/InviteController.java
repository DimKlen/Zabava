package com.zabava.api.social;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

import com.zabava.api.config.AppProperties;
import com.zabava.api.social.SocialStore.ProfileRow;

import io.swagger.v3.oas.annotations.Hidden;

/**
 * Liens d'invitation https://{domaine}/u/{pseudo} (specs/social/docs/02 §4), ouverts sans compte :
 * {@code assetlinks.json} pour qu'Android les ouvre dans l'app, et page web de repli quand l'app
 * n'est pas installée. Pas de stores (specs/social/MAPPING.md) : la page propose d'ouvrir l'app.
 */
@RestController
@Hidden
public class InviteController {

    private static final Pattern USERNAME = Pattern.compile("[a-zA-Z0-9._]{3,20}");
    private static final MediaType HTML = new MediaType(MediaType.TEXT_HTML, StandardCharsets.UTF_8);
    private static final CacheControl CACHE = CacheControl.maxAge(java.time.Duration.ofMinutes(5)).cachePublic();

    private final SocialStore store;
    private final AppProperties.App app;

    public InviteController(SocialStore store, AppProperties props) {
        this.store = store;
        this.app = props.app();
    }

    /** App Links Android : l'app signée par ces certificats ouvre les liens du domaine. */
    @GetMapping(value = "/.well-known/assetlinks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Object>>> assetLinks() {
        Map<String, Object> target = Map.of(
                "namespace", "android_app",
                "package_name", app.packageName(),
                "sha256_cert_fingerprints", app.certSha256());
        return ResponseEntity.ok()
                .cacheControl(CACHE)
                .body(List.of(Map.of("relation", List.of("delegate_permission/common.handle_all_urls"), "target", target)));
    }

    /** Page de repli : avatar, nom, @pseudo et « Ouvrir dans Zabava ». */
    @GetMapping(value = "/u/{username}", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> profilePage(@PathVariable String username) {
        Optional<ProfileRow> profile = USERNAME.matcher(username).matches()
                ? store.findByUsername(username)
                : Optional.empty();
        if (profile.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .contentType(HTML)
                    .body(page("Zabava", "<p class=\"missing\">Ce profil n'existe pas ou n'est plus disponible</p>"));
        }
        ProfileRow p = profile.get();
        String handle = escape(p.username());
        String name = escape(p.displayName() == null || p.displayName().isBlank()
                ? p.username()
                : p.displayName());
        String body = avatar(p, name)
                + "<h1>" + name + "</h1>"
                + "<p class=\"handle\">@" + handle + "</p>"
                + "<a class=\"open\" href=\"" + app.scheme() + "://u/" + handle + "\">Ouvrir dans Zabava</a>";
        return ResponseEntity.ok()
                .contentType(HTML)
                .cacheControl(CACHE)
                .body(page(name + " (@" + handle + ") · Zabava", body));
    }

    private static String avatar(ProfileRow p, String name) {
        String url = p.avatarUrl();
        if (url != null && url.startsWith("https://")) {
            return "<img class=\"avatar\" src=\"" + escape(url) + "\" alt=\"\">";
        }
        String initial = name.isEmpty() ? "" : name.substring(0, name.offsetByCodePoints(0, 1)).toUpperCase();
        return "<div class=\"avatar initial\">" + initial + "</div>";
    }

    /** Échappe seulement les caractères spéciaux du HTML (la page est en UTF-8). */
    private static String escape(String text) {
        return HtmlUtils.htmlEscape(text, StandardCharsets.UTF_8.name());
    }

    /** Couleurs Nocturne de l'app (mobile/src/theme/tokens.ts). */
    private static String page(String title, String body) {
        return """
                <!doctype html>
                <html lang="fr-CA">
                <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>%s</title>
                <style>
                  body { margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center;
                    justify-content: center; gap: 8px; padding: 24px; box-sizing: border-box; background: #161826;
                    color: #e9e9ed; font-family: Inter, system-ui, sans-serif; text-align: center; }
                  .avatar { width: 96px; height: 96px; border-radius: 50%%; object-fit: cover; margin-bottom: 8px; }
                  .initial { display: flex; align-items: center; justify-content: center; background: #232532;
                    font-size: 38px; font-weight: 500; }
                  h1 { margin: 0; font-size: 22px; font-weight: 500; }
                  .handle { margin: 0; font-size: 14px; color: #9397ab; }
                  .open { margin-top: 16px; min-height: 48px; padding: 0 24px; display: inline-flex; align-items: center;
                    border: 1px solid #9184d9; border-radius: 8px; color: #9184d9; font-size: 15px; font-weight: 500;
                    text-decoration: none; }
                  .missing { margin: 0; font-size: 16px; color: #b2b6ca; }
                </style>
                </head>
                <body>
                %s
                </body>
                </html>
                """.formatted(title, body);
    }
}
