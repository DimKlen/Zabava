package com.zabava.api.social;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import com.zabava.api.common.ApiException;

/** Curseurs de pagination opaques pour l'app. */
final class Cursors {

    private Cursors() {}

    /** Position dans le fil : instant (en microsecondes, précision de Postgres) et identifiant. */
    record FeedPosition(Instant at, long id) {}

    static String offset(int value) {
        return Integer.toString(value);
    }

    static int offset(String cursor) {
        if (cursor == null || cursor.isBlank()) return 0;
        try {
            int value = Integer.parseInt(cursor);
            if (value < 0) throw new NumberFormatException();
            return value;
        } catch (NumberFormatException e) {
            throw ApiException.badRequest("Curseur invalide");
        }
    }

    static String feed(Instant at, long id) {
        return ChronoUnit.MICROS.between(Instant.EPOCH, at) + "_" + id;
    }

    static FeedPosition feed(String cursor) {
        if (cursor == null || cursor.isBlank()) return null;
        int sep = cursor.indexOf('_');
        try {
            long micros = Long.parseLong(cursor.substring(0, sep));
            long id = Long.parseLong(cursor.substring(sep + 1));
            return new FeedPosition(Instant.EPOCH.plus(micros, ChronoUnit.MICROS), id);
        } catch (RuntimeException e) {
            throw ApiException.badRequest("Curseur invalide");
        }
    }
}
