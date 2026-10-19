import { Linking, StyleSheet, View } from 'react-native';

import { ProviderLogo } from '@/components/ProviderLogo';
import { Text } from '@/components/Text';
import { mineFirst } from '@/domain/availability';
import type { Availability, Provider } from '@/domain/types';
import { showToast } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { fonts, typography } from '@/theme/typography';

import { InfoSection } from './InfoSection';

type Props = { availability: Availability; myProviderIds: readonly number[] };

function open(provider: Provider, fallbackLink: string | undefined) {
  const link = provider.link ?? fallbackLink;
  if (link) void Linking.openURL(link).catch(() => undefined);
  showToast(`Ouverture de ${provider.name}…`);
}

/** « Où regarder » : les plateformes de location, sans libellé ; les miennes en premier et cerclées. */
export function WhereToWatch({ availability, myProviderIds }: Props) {
  const providers = mineFirst(availability.rent, myProviderIds);

  return (
    <InfoSection title="Où regarder">
      {providers.length > 0 ? (
        <View style={styles.logos}>
          {providers.map((provider) => (
            <ProviderLogo
              key={provider.id}
              provider={provider}
              mine={myProviderIds.includes(provider.id)}
              onPress={() => open(provider, availability.link)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.unknown}>Disponibilité inconnue pour ta région.</Text>
      )}
      <Text style={styles.credit}>Données JustWatch · tes plateformes sont cerclées</Text>
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
  credit: {
    marginTop: 10,
    fontFamily: fonts.regular,
    fontSize: 11,
    lineHeight: 11 * 1.3,
    color: colors.neutral500,
  },
});
