package com.zabava.api.tmdb;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class TmdbLanguageTest {

    @Test
    void codesSimplesDeLApp() {
        assertEquals("fr-FR", TmdbClient.tmdbLanguage("fr"));
        assertEquals("en-US", TmdbClient.tmdbLanguage("en"));
        assertEquals("es-ES", TmdbClient.tmdbLanguage("es"));
        assertEquals("pt-PT", TmdbClient.tmdbLanguage("pt"));
        assertEquals("de-DE", TmdbClient.tmdbLanguage("de"));
        assertEquals("it-IT", TmdbClient.tmdbLanguage("it"));
        assertEquals("ja-JP", TmdbClient.tmdbLanguage("ja"));
    }

    @Test
    void anciensCodesRestentLus() {
        assertEquals("fr-FR", TmdbClient.tmdbLanguage("fr-CA"));
        assertEquals("en-US", TmdbClient.tmdbLanguage("en-CA"));
    }

    @Test
    void langueAbsente() {
        assertNull(TmdbClient.tmdbLanguage(null));
    }
}
