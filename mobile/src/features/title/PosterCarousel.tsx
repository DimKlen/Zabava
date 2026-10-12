import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import type { PosterTitle } from '@/api/catalog';
import { toggleInList } from '@/api/libraryActions';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { Poster } from '@/components/Poster';

import { InfoSection } from './InfoSection';

type Props = {
  title: string;
  titles: PosterTitle[];
  /** Identifiants des titres déjà dans ma liste (coche du « + »). */
  libraryIds: ReadonlySet<string>;
};

/** Carrousel d'affiches 104 (Saga, Titres similaires) : tap → fiche, « + » → ajout rapide. */
export function PosterCarousel({ title, titles, libraryIds }: Props) {
  if (titles.length === 0) return null;
  return (
    <InfoSection title={title} fullWidth>
      <HorizontalCarousel
        data={titles}
        keyExtractor={(item) => item.id}
        renderItem={(item) => (
          <Poster
            title={item}
            showAdd
            inList={libraryIds.has(item.id)}
            onPress={() => router.push(`/title/${item.type}/${item.tmdbId}`)}
            onToggle={() => toggleInList(item)}
            style={styles.poster}
          />
        )}
      />
    </InfoSection>
  );
}

const styles = StyleSheet.create({
  poster: {
    width: 104,
  },
});
