package com.zabava.api.me;

import java.util.UUID;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import com.zabava.api.config.AppProperties;

/** Admin API de Supabase Auth (suppression du compte, obligatoire pour l'App Store). */
@Component
public class SupabaseAdminClient {

    private final RestClient http;

    public SupabaseAdminClient(AppProperties props, JdkClientHttpRequestFactory requestFactory) {
        String key = props.supabase().serviceRoleKey();
        this.http = RestClient.builder()
                .baseUrl(props.supabase().url())
                .requestFactory(requestFactory)
                .defaultHeader("apikey", key)
                .defaultHeader("Authorization", "Bearer " + key)
                .build();
    }

    /** Supprime l'utilisateur ; ses données suivent en cascade. Idempotent. */
    public void deleteUser(UUID id) {
        try {
            http.delete().uri("/auth/v1/admin/users/{id}", id).retrieve().toBodilessEntity();
        } catch (HttpClientErrorException.NotFound e) {
            // Déjà supprimé.
        }
    }
}
