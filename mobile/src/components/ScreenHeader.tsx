import { MagnifyingGlassIcon } from 'phosphor-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { Button } from './Button';
import { Text } from './Text';

type Props = {
  title: string;
  /** Ma liste et Découvrir : bouton recherche. À venir et Profil : aucun. */
  onSearch?: () => void;
  /** Boutons icône à droite (Profil : Inviter et Réglages). */
  actions?: ReactNode;
};

/** Titre d'écran 28/500, avec la loupe (ou d'autres boutons) à droite si besoin. */
export function ScreenHeader({ title, onSearch, actions }: Props) {
  return (
    <View style={onSearch || actions ? styles.withSearch : styles.plain}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
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
  actions: {
    flexDirection: 'row',
  },
  title: {
    ...typography.screenTitle,
    color: colors.text,
  },
});
