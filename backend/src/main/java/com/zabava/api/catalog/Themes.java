package com.zabava.api.catalog;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Sous-genres (dans la liste d'un genre) et ambiances (Découvrir › Par ambiance), demandés le
 * 2026-11-15. Chaque thème est un ou plusieurs mots-clés TMDB ({@code with_keywords}, en OU) :
 * plusieurs mots-clés proches quand un seul compte trop peu de titres.
 */
public final class Themes {

    private Themes() {}

    public record Theme(String key, List<Integer> keywordIds) {}

    public static final List<Theme> ALL = List.of(
            // ─── Sous-genres ───
            new Theme("arts-martiaux", List.of(779, 156159)),
            new Theme("braquage", List.of(10051, 191845, 250043)),
            new Theme("espionnage", List.of(470)),
            new Theme("super-heros", List.of(9715, 155030)),
            new Theme("chasse-au-tresor", List.of(6956, 215470)),
            new Theme("road-movie", List.of(167043)),
            new Theme("pirates", List.of(12988, 185200, 4418)),
            new Theme("expedition", List.of(1963)),
            new Theme("humour-noir", List.of(10123)),
            new Theme("parodie", List.of(9755, 249969)),
            new Theme("satire", List.of(8201, 252201)),
            new Theme("histoire-vraie", List.of(9672)),
            new Theme("biopic", List.of(5565)),
            new Theme("passage-a-l-age-adulte", List.of(10683)),
            new Theme("judiciaire", List.of(33519, 214780)),
            new Theme("magie", List.of(2343, 4252)),
            new Theme("dragons", List.of(12554)),
            new Theme("contes", List.of(3205, 221039, 210586)),
            new Theme("vampires", List.of(3133)),
            new Theme("slasher", List.of(12339)),
            new Theme("zombies", List.of(12377, 186565)),
            new Theme("possession", List.of(161261)),
            new Theme("maison-hantee", List.of(3358)),
            new Theme("cyberpunk", List.of(12190)),
            new Theme("dystopie", List.of(4565)),
            new Theme("extraterrestres", List.of(9951, 192962)),
            new Theme("intelligence-artificielle", List.of(310)),
            new Theme("tueur-en-serie", List.of(10714, 227428)),
            new Theme("complot", List.of(10410, 298530, 298532)),
            new Theme("enquete", List.of(703, 15167, 160342)),
            new Theme("psychologique", List.of(12565)),
            new Theme("stop-motion", List.of(10121)),
            new Theme("pour-adultes", List.of(161919)),
            new Theme("nature", List.of(18330, 221355, 284176)),
            new Theme("true-crime", List.of(33722)),
            new Theme("sport", List.of(159290)),
            new Theme("musique", List.of(246377)),
            // ─── Ambiances : narration ───
            new Theme("non-lineaire", List.of(157171, 321059, 262522, 351956)),
            new Theme("boucle-temporelle", List.of(10854)),
            new Theme("voyage-dans-le-temps", List.of(4379)),
            new Theme("univers-paralleles", List.of(33465, 175629, 336874)),
            // ─── Psychologie ───
            new Theme("mindfuck", List.of(362567, 3972, 1453, 12565)),
            new Theme("twist-final", List.of(275311, 326438, 373440, 331114, 335567)),
            new Theme("puzzle", List.of(9228, 17996)),
            new Theme("narrateur-peu-fiable", List.of(174089)),
            // ─── Tension ───
            new Theme("slow-burn", List.of(277551, 155800)),
            new Theme("survie", List.of(10349, 50009)),
            new Theme("derangeant", List.of(361070, 367153, 295907, 283085, 262404)),
            new Theme("chat-et-souris", List.of(15076)),
            // ─── Concepts ───
            new Theme("found-footage", List.of(163053, 365923)),
            new Theme("huis-clos", List.of(368386, 2147, 227951, 348145)),
            new Theme("faux-documentaire", List.of(11800)),
            new Theme("film-d-auteur", List.of(11130, 318182, 281237)),
            new Theme("plan-sequence", List.of(209590, 338604, 206921, 173361)));

    private static final Map<String, Theme> BY_KEY = new LinkedHashMap<>();

    static {
        ALL.forEach(t -> BY_KEY.put(t.key(), t));
    }

    public static Theme byKey(String key) {
        Theme theme = BY_KEY.get(key);
        if (theme == null) throw new IllegalArgumentException("Thème inconnu : " + key);
        return theme;
    }

    /** Mots-clés TMDB des thèmes demandés, sans doublon : un titre en a au moins un. */
    public static List<Integer> keywordIds(List<String> keys) {
        return keys.stream()
                .map(Themes::byKey)
                .flatMap(t -> t.keywordIds().stream())
                .distinct()
                .toList();
    }
}
