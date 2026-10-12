import { MagnifyingGlassIcon } from 'phosphor-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Button } from './Button';

type Props = {
  title: string;
  /** Ma liste et Découvrir : bouton recherche. À venir et Profil : aucun. */
  onSearch?: () => void;
};

/** Titre d'écran 28/500, avec la loupe à droite si besoin. */
export function ScreenHeader({ title, onSearch }: Props) {
  return (
    <View style={onSearch ? styles.withSearch : styles.plain}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {onSearch ? (
        <Button
          variant="icon"
          height={44}
          icon={MagnifyingGlassIcon}
          iconSize={22}
          color={colors.text}
          accessibilityLabel="Rechercher"
          onPress={onSearch}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  withSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingRight: 8,
    paddingLeft: 16,
  },
  plain: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
});
