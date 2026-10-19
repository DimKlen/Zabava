import { StyleSheet } from 'react-native';

import type { PosterTitle } from '@/api/catalog';
import { toggleInList } from '@/api/libraryActions';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { Poster } from '@/components/Poster';

import { InfoSection } from './InfoSection';
import { openTitle, pressTitle, previewOf } from './openTitle';

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
            onPress={() => openTitle(previewOf(item, 'w342'))}
            onPressIn={() => pressTitle(previewOf(item, 'w342'))}
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
