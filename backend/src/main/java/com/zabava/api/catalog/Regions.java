package com.zabava.api.catalog;

import java.util.Set;

/** Régions proposées dans l'app (profil) : seules leurs offres et dates de sortie sont enregistrées. */
public final class Regions {

    public static final Set<String> SUPPORTED = Set.of("CA", "FR", "BE", "CH", "US");

    private Regions() {}
}
