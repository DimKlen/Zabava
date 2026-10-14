package com.zabava.api.notifications;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import com.zabava.api.common.Json;
import com.zabava.api.config.AppProperties;

import tools.jackson.databind.JsonNode;

/** Expo Push API : envoi par lots de 100 (specs/docs/11 §4). */
@Component
public class ExpoPushClient {

    static final int BATCH_SIZE = 100;

    /** Message pour un appareil ; {@code url} est le lien profond ouvert au tap. */
    public record PushMessage(String token, String body, String url) {}

    private final RestClient http;

    public ExpoPushClient(AppProperties props, JdkClientHttpRequestFactory requestFactory) {
        RestClient.Builder builder = RestClient.builder()
                .baseUrl(props.expo().baseUrl())
                .requestFactory(requestFactory)
                .defaultHeader("Accept", "application/json");
        if (StringUtils.hasText(props.expo().accessToken())) {
            builder.defaultHeader("Authorization", "Bearer " + props.expo().accessToken());
        }
        this.http = builder.build();
    }

    /**
     * Envoie les messages et renvoie les jetons qu'Expo ne connaît plus (DeviceNotRegistered),
     * à supprimer.
     */
    public List<String> send(List<PushMessage> messages) {
        List<String> unregistered = new ArrayList<>();
        for (int from = 0; from < messages.size(); from += BATCH_SIZE) {
            List<PushMessage> batch = messages.subList(from, Math.min(from + BATCH_SIZE, messages.size()));
            List<Map<String, Object>> payload = batch.stream()
                    .map(m -> Map.<String, Object>of(
                            "to", m.token(),
                            "body", m.body(),
                            "sound", "default",
                            "channelId", "default",
                            "data", Map.of("url", m.url())))
                    .toList();
            JsonNode response = http.post()
                    .uri("/--/api/v2/push/send")
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);
            List<JsonNode> tickets = response == null ? List.of() : Json.array(response, "data");
            for (int i = 0; i < tickets.size() && i < batch.size(); i++) {
                JsonNode ticket = tickets.get(i);
                if ("DeviceNotRegistered".equals(Json.text(ticket.path("details"), "error"))) {
                    unregistered.add(batch.get(i).token());
                }
            }
        }
        return unregistered;
    }
}
