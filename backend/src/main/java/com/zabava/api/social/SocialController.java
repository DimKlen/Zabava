package com.zabava.api.social;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.zabava.api.auth.CurrentUser;
import com.zabava.api.social.dto.SocialDtos.AcceptAllResult;
import com.zabava.api.social.dto.SocialDtos.Activity;
import com.zabava.api.social.dto.SocialDtos.FollowResult;
import com.zabava.api.social.dto.SocialDtos.MemberLite;
import com.zabava.api.social.dto.SocialDtos.Page;
import com.zabava.api.social.dto.SocialDtos.ProfileTitle;
import com.zabava.api.social.dto.SocialDtos.ReportRequest;
import com.zabava.api.social.dto.SocialDtos.TitleSocial;
import com.zabava.api.social.dto.SocialDtos.UserProfile;
import com.zabava.api.social.dto.SocialDtos.UsernameAvailability;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Endpoints sociaux (specs/social/docs/06 §3). Les pseudos des chemins sont en minuscules. */
@RestController
@RequestMapping("/api/v1")
@Validated
public class SocialController {

    private final UsernameService usernames;
    private final UserService users;
    private final FollowService follows;
    private final FeedService feed;

    public SocialController(UsernameService usernames, UserService users, FollowService follows, FeedService feed) {
        this.usernames = usernames;
        this.users = users;
        this.follows = follows;
        this.feed = feed;
    }

    // ─── Membres ──────────────────────────────────────────────────────────────

    @GetMapping("/users/username-available")
    public UsernameAvailability usernameAvailable(CurrentUser user, @RequestParam @Size(max = 50) String u) {
        return usernames.availability(user.id(), u);
    }

    @GetMapping("/users/search")
    public Page<MemberLite> search(
            CurrentUser user,
            @RequestParam @Size(max = 100) String q,
            @RequestParam(required = false) String cursor) {
        return users.search(user.id(), q, cursor);
    }

    @GetMapping("/users/{username}")
    public UserProfile profile(CurrentUser user, @PathVariable String username) {
        return users.profile(user.id(), username);
    }

    @GetMapping("/users/{username}/titles")
    public Page<ProfileTitle> titles(
            CurrentUser user,
            @PathVariable String username,
            @RequestParam @Pattern(regexp = "movie|tv|anime") String type,
            @RequestParam @Pattern(regexp = "towatch|watched|in_progress|finished") String status,
            @RequestParam(required = false) String cursor) {
        return users.titles(user.id(), username, type, status, cursor);
    }

    @GetMapping("/users/{username}/friends")
    public Page<MemberLite> friends(
            CurrentUser user,
            @PathVariable String username,
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) String cursor) {
        return users.friends(user.id(), username, q, cursor);
    }

    // ─── Amis (abonnements réciproques) ───────────────────────────────────────

    @PostMapping("/users/{username}/follow")
    public FollowResult follow(CurrentUser user, @PathVariable String username) {
        return follows.follow(user.id(), username);
    }

    @DeleteMapping("/users/{username}/follow")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unfollow(CurrentUser user, @PathVariable String username) {
        follows.unfollow(user.id(), username);
    }

    @GetMapping("/me/follow-requests")
    public Page<MemberLite> followRequests(CurrentUser user, @RequestParam(required = false) String cursor) {
        return follows.requests(user.id(), cursor);
    }

    @PostMapping("/me/follow-requests/{username}/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void accept(CurrentUser user, @PathVariable String username) {
        follows.accept(user.id(), username);
    }

    @PostMapping("/me/follow-requests/{username}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(CurrentUser user, @PathVariable String username) {
        follows.decline(user.id(), username);
    }

    @PostMapping("/me/follow-requests/accept-all")
    public AcceptAllResult acceptAll(CurrentUser user) {
        return new AcceptAllResult(follows.acceptAll(user.id()));
    }

    // ─── Signalement ──────────────────────────────────────────────────────────

    @PostMapping("/users/{username}/report")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void report(CurrentUser user, @PathVariable String username, @Valid @RequestBody ReportRequest request) {
        follows.report(user.id(), username, request.reason());
    }

    // ─── Fil et fiches ────────────────────────────────────────────────────────

    @GetMapping("/me/feed")
    public Page<Activity> feed(
            CurrentUser user,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) @Min(1) @Max(50) Integer limit) {
        return feed.feed(user.id(), cursor, limit);
    }

    @GetMapping("/titles/{type}/{tmdbId}/social")
    public TitleSocial titleSocial(
            CurrentUser user, @PathVariable @Pattern(regexp = "movie|tv|anime") String type, @PathVariable int tmdbId) {
        return feed.titleSocial(user.id(), type, tmdbId);
    }

    // ─── Profils visités ──────────────────────────────────────────────────────

    @GetMapping("/me/recent-profiles")
    public List<MemberLite> recentProfiles(CurrentUser user) {
        return users.recentProfiles(user.id());
    }

    @PostMapping("/me/recent-profiles/{username}")
    public List<MemberLite> visit(CurrentUser user, @PathVariable String username) {
        return users.visit(user.id(), username);
    }
}
