import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

import { useRegionProviders } from '@/api/catalog';
import { useProfile } from '@/api/profile';
import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { SkeletonBox } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { isGroupSelected, searchProviders, topProviders } from '@/domain/providers';
import { colors, durations, radii } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { PlatformTile } from '../onboarding/PlatformTile';
import { toggleProvider } from './profileActions';

const COLUMNS = 4;
const GAP = 8;
const SIDE = 16;
const SKELETONS = 8;
/** Espace laissé au-dessus de la sheet, comme la recherche avancée. */
const TOP_GAP = 56;
/** Tuile en chargement : 12 + pastille 36 + 6 + nom 15 + 10, arrondi. */
const TILE_HEIGHT = 80;

type Props = { visible: boolean; onClose: () => void };

/** Mes plateformes (Profil) : grille de 4 colonnes, chaque tap enregistré tout de suite. */
export function PlatformsSheet({ visible, onClose }: Props) {
  const { width, height } = useWindowDimensions();
  const profile = useProfile().data;
  const providers = useRegionProviders(profile?.region);
  const selectedIds = profile?.providerIds ?? [];
  // Largeur réelle de la grille ; 1 pt de marge, sinon l'arrondi au pixel fait passer
  // la 4e tuile à la ligne.
  const [gridWidth, setGridWidth] = useState(width - SIDE * 2);
  const tileWidth = Math.floor((gridWidth - GAP * (COLUMNS - 1)) / COLUMNS) - 1;
  const [query, setQuery] = useState('');
  const shown = searchProviders(topProviders(providers.data ?? [], selectedIds), query);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      enterDuration={durations.sheetPlatforms}
      panelStyle={[styles.panel, { maxHeight: height - TOP_GAP }]}
    >
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Mes plateformes
        </Text>
        <Button variant="primary" height={36} label="OK" onPress={onClose} />
      </View>
      <TextField
        height={42}
        icon={MagnifyingGlassIcon}
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher une plateforme"
        accessibilityLabel="Rechercher une plateforme"
        autoCorrect={false}
        returnKeyType="search"
        style={styles.search}
      />
      <ScrollView
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.grid}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      >
        {providers.data
          ? shown.map((provider) => (
              <PlatformTile
                key={provider.id}
                provider={provider}
                selected={isGroupSelected(provider, selectedIds)}
                width={tileWidth}
                onToggle={() => void toggleProvider(provider)}
                compact
              />
            ))
          : Array.from({ length: SKELETONS }, (_, i) => (
              <SkeletonBox key={i} width={tileWidth} height={TILE_HEIGHT} radius={radii.rLg} />
            ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  panel: {
    paddingTop: 12,
    paddingHorizontal: SIDE,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    ...typography.section,
    color: colors.text,
  },
  search: {
    marginBottom: 12,
  },
  scroll: {
    flexShrink: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
});
