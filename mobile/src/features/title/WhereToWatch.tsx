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

type Props = { availability: Availability; myProviderIds: readonly number[] };

function open(provider: Provider, fallbackLink: string | undefined) {
  const link = provider.link ?? fallbackLink;
  if (link) void Linking.openURL(link).catch(() => undefined);
  showToast(`Ouverture de ${baseProviderName(provider.name)}…`);
}

/** « Où regarder » : toutes les plateformes, avec leurs pays ; les miennes en premier et cerclées. */
export function WhereToWatch({ availability, myProviderIds }: Props) {
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
