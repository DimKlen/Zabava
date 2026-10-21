import { Linking, StyleSheet, View } from 'react-native';

import { ProviderLogo } from '@/components/ProviderLogo';
import { Text } from '@/components/Text';
import { whereToWatch } from '@/domain/availability';
import { baseProviderName, isGroupSelected } from '@/domain/providers';
import type { Availability, Provider } from '@/domain/types';
import { showToast } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { InfoSection } from './InfoSection';

type Props = {
  availability: Availability;
  myProviderIds: readonly number[];
  /** Région du profil (« Netflix » chez moi, « Netflix (USA) » ailleurs). */
  region: string | undefined;
};

function open(provider: Provider, fallbackLink: string | undefined) {
  const link = provider.link ?? fallbackLink;
  if (link) void Linking.openURL(link).catch(() => undefined);
  showToast(`Ouverture de ${baseProviderName(provider.name)}…`);
}

/**
 * « Où regarder » : toutes les plateformes, avec le pays le plus proche quand elles ne proposent
 * pas le titre dans ma région ; les miennes en premier et cerclées.
 */
export function WhereToWatch({ availability, myProviderIds, region }: Props) {
  const providers = whereToWatch(availability, myProviderIds);

  return (
    <InfoSection title="Où regarder">
      {providers.length > 0 ? (
        <View style={styles.logos}>
          {providers.map((provider) => (
            <ProviderLogo
              key={provider.id}
              provider={provider}
              mine={isGroupSelected(provider, myProviderIds)}
              region={region}
              onPress={() => open(provider, availability.link)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.unknown}>Disponibilité inconnue.</Text>
      )}
    </InfoSection>
  );
}

const styles = StyleSheet.create({
  logos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  unknown: {
    ...typography.label,
    color: colors.neutral400,
  },
});
