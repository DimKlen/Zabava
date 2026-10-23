package com.zabava.api.common;

import java.util.Map;

import org.springframework.http.HttpStatus;

/** Erreur métier renvoyée au client sous la forme {@code {"error": {code, message}}}. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    /** Champs ajoutés à l'objet {@code error} (ex. {@code nextChangeAt}). */
    private final Map<String, String> details;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public ApiException(HttpStatus status, String code, String message, Map<String, String> details) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, "not_found", message);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, "bad_request", message);
    }

    public static ApiException upstream(String message) {
        return new ApiException(HttpStatus.BAD_GATEWAY, "upstream_error", message);
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public Map<String, String> details() {
        return details;
    }
}
