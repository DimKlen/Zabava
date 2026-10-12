package com.zabava.api.common;

import org.springframework.http.HttpStatus;

/** Erreur métier renvoyée au client sous la forme {@code {"error": {code, message}}}. */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
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
}
