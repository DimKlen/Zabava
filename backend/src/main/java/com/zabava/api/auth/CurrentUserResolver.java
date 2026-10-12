package com.zabava.api.auth;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import com.zabava.api.me.ProfileService;

/**
 * Injecte {@link CurrentUser} dans les contrôleurs et garantit l'existence du profil
 * (normalement créé par le trigger Supabase à l'inscription).
 */
@Configuration
public class CurrentUserResolver implements HandlerMethodArgumentResolver, WebMvcConfigurer {

    private final ProfileService profiles;

    public CurrentUserResolver(ProfileService profiles) {
        this.profiles = profiles;
    }

    @Override
    public void addArgumentResolvers(java.util.List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(this);
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.getParameterType().equals(CurrentUser.class);
    }

    @Override
    public CurrentUser resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {
        var auth = (JwtAuthenticationToken) SecurityContextHolder.getContext().getAuthentication();
        CurrentUser user = CurrentUser.from(auth.getToken());
        profiles.ensureExists(user);
        return user;
    }
}
