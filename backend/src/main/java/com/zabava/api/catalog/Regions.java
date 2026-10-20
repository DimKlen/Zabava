package com.zabava.api.catalog;

import java.util.List;
import java.util.Set;

/**
 * Pays dont les offres et les dates de sortie sont enregistrées. L'utilisateur ne choisit plus de région :
 * « Où regarder » et les badges rassemblent les offres de tous ces pays.
 */
public final class Regions {

    public static final List<String> ALL = List.of("CA", "FR", "BE", "CH", "US", "GB", "DE", "ES", "IT");

    public static final Set<String> SUPPORTED = Set.copyOf(ALL);

    private Regions() {}
}
