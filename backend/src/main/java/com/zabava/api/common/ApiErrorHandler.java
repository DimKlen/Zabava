package com.zabava.api.common;

import java.util.LinkedHashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import jakarta.validation.ConstraintViolationException;

/** Format d'erreur unique : {@code {"error": {"code": "...", "message": "..."}}} (docs/11 §3). */
@RestControllerAdvice
public class ApiErrorHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiErrorHandler.class);

    public record ErrorBody(Map<String, String> error) {
        static ErrorBody of(String code, String message) {
            return of(code, message, Map.of());
        }

        static ErrorBody of(String code, String message, Map<String, String> details) {
            Map<String, String> error = new LinkedHashMap<>(details);
            error.put("code", code);
            error.put("message", message == null ? "" : message);
            return new ErrorBody(error);
        }
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorBody> api(ApiException e) {
        return ResponseEntity.status(e.status()).body(ErrorBody.of(e.code(), e.getMessage(), e.details()));
    }

    @ExceptionHandler({
        MethodArgumentNotValidException.class,
        HandlerMethodValidationException.class,
        ConstraintViolationException.class,
        MissingServletRequestParameterException.class,
        MethodArgumentTypeMismatchException.class,
        HttpMessageNotReadableException.class,
        IllegalArgumentException.class
    })
    ResponseEntity<ErrorBody> badRequest(Exception e) {
        return ResponseEntity.badRequest().body(ErrorBody.of("bad_request", e.getMessage()));
    }

    @ExceptionHandler(RestClientException.class)
    ResponseEntity<ErrorBody> upstream(RestClientException e) {
        log.warn("Source externe indisponible", e);
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(ErrorBody.of("upstream_error", "Source externe indisponible"));
    }
}
