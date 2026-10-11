package com.zabava.api.common;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

import tools.jackson.databind.JsonNode;

/** Lecture tolérante du JSON des sources externes (Jackson 3). */
public final class Json {

    private Json() {}

    /** Texte du champ, ou null s'il est absent, nul ou vide. */
    public static String text(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        String text = value.asString("");
        return text.isBlank() ? null : text;
    }

    public static Integer integer(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        int parsed = value.asInt(Integer.MIN_VALUE);
        return parsed == Integer.MIN_VALUE ? null : parsed;
    }

    public static Double decimal(JsonNode node, String field) {
        JsonNode value = node.path(field);
        if (value.isMissingNode() || value.isNull()) return null;
        double parsed = value.asDouble(Double.NaN);
        return Double.isNaN(parsed) ? null : parsed;
    }

    public static boolean bool(JsonNode node, String field) {
        return node.path(field).asBoolean(false);
    }

    public static List<JsonNode> array(JsonNode node, String field) {
        JsonNode value = node.path(field);
        return value.isArray() ? new ArrayList<>(value.values()) : List.of();
    }

    public static <T> List<T> map(JsonNode node, String field, Function<JsonNode, T> mapper) {
        return array(node, field).stream().map(mapper).toList();
    }
}
