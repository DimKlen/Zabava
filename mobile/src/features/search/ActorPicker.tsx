import { XIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePersonSuggestions } from '@/api/search';
import { TextField } from '@/components/TextField';
import { ACTOR_QUERY_MIN, MAX_ACTOR_SUGGESTIONS, type Actor } from '@/domain/advancedSearch';
import { SEARCH_DEBOUNCE_MS } from '@/domain/search';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { colors, radii } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

type Props = {
  actors: Actor[];
  onAdd: (actor: Actor) => void;
  onRemove: (id: number) => void;
};

/** Acteurs choisis (tap = retirer) et champ d'autocomplétion (2 caractères, 300 ms). */
export function ActorPicker({ actors, onAdd, onRemove }: Props) {
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim(), SEARCH_DEBOUNCE_MS);
  const active = query.length >= ACTOR_QUERY_MIN && text.trim().length >= ACTOR_QUERY_MIN;
  const suggestions = usePersonSuggestions(query, active);
  const chosen = new Set(actors.map((actor) => actor.id));
  const visible = active
    ? (suggestions.data ?? [])
        .filter((person) => !chosen.has(person.id))
        .slice(0, MAX_ACTOR_SUGGESTIONS)
    : [];

  return (
    <View>
      {actors.length > 0 ? (
        <View style={styles.tags}>
          {actors.map((actor) => (
            <Pressable
              key={actor.id}
              accessibilityRole="button"
              accessibilityLabel={`Retirer ${actor.name}`}
              onPress={() => onRemove(actor.id)}
              hitSlop={8}
              style={styles.tag}
            >
              <Text style={styles.tagText}>{actor.name}</Text>
              <XIcon size={12} color={colors.accent100} />
            </Pressable>
          ))}
        </View>
      ) : null}
      <TextField
        height={42}
        value={text}
        onChangeText={setText}
        placeholder="Ajouter un acteur ou une actrice"
        autoCorrect={false}
        autoCapitalize="words"
        returnKeyType="done"
      />
      {visible.length > 0 ? (
        <View style={styles.suggestions}>
          {visible.map((person) => (
            <Pressable
              key={person.id}
              accessibilityRole="button"
              onPress={() => {
                onAdd({ id: person.id, name: person.name });
                setText('');
              }}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
            >
              <Text numberOfLines={1} style={styles.suggestionText}>
                {person.name}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: radii.rMd * 0.75,
    backgroundColor: colors.accent800,
  },
  tagText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    letterSpacing: 0.24,
    color: colors.accent100,
  },
  suggestions: {
    marginTop: 4,
    borderRadius: radii.rMd,
    overflow: 'hidden',
    backgroundColor: colors.neutral900,
  },
  suggestion: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  pressed: {
    backgroundColor: colors.neutral800,
  },
  suggestionText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 14 * 1.4,
    color: colors.text,
  },
});
