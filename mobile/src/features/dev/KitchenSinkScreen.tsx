import { router } from 'expo-router';
import {
  AppleLogoIcon,
  BellRingingIcon,
  CaretLeftIcon,
  CircleIcon,
  DotsThreeIcon,
  EyeIcon,
  EyeSlashIcon,
  FilmStripIcon,
  GoogleLogoIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  SortAscendingIcon,
  TrashIcon,
} from 'phosphor-react-native';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CheckButton } from '@/components/CheckButton';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { GradientFill } from '@/components/GradientFill';
import { HorizontalCarousel } from '@/components/HorizontalCarousel';
import { NextEpisodeCard } from '@/components/NextEpisodeCard';
import { OfflineBannerView } from '@/components/OfflineBanner';
import { Poster } from '@/components/Poster';
import { PosterGrid } from '@/components/PosterGrid';
import { ProviderLogo } from '@/components/ProviderLogo';
import { RatingChips } from '@/components/RatingChips';
import { RoundIconButton } from '@/components/RoundIconButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { Segmented } from '@/components/Segmented';
import { SelectField } from '@/components/SelectField';
import { SkeletonCard, SkeletonPoster, SkeletonSearchRow } from '@/components/Skeleton';
import { Switch } from '@/components/Switch';
import { Text } from '@/components/Text';
import { UnderlineTabs } from '@/components/UnderlineTabs';
import { episodeCode } from '@/domain/format';
import { openActionSheet, openDialog, showToast } from '@/store/ui';
import { colors, spacing } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { demoEpisodes, demoProviders, demoTitles, type DemoTitle } from './demoData';

type Region = 'CA' | 'FR' | 'BE' | 'CH' | 'US';

/** Écran de démonstration de tous les composants de specs/docs/03 (développement seulement). */
export function KitchenSinkScreen() {
  const insets = useSafeAreaInsets();
  const [inList, setInList] = useState<Record<string, boolean>>({ obaa: true });

  const toggle = (title: DemoTitle) => {
    const was = inList[title.id] ?? false;
    setInList((s) => ({ ...s, [title.id]: !was }));
    showToast(was ? 'Retiré de ma liste' : 'Ajouté à ma liste', () =>
      setInList((s) => ({ ...s, [title.id]: was })),
    );
  };

  const filmSheet = (title: DemoTitle) =>
    openActionSheet({
      title: title.title,
      options: [
        { label: 'Marquer comme vu', icon: EyeIcon, onPress: () => showToast('Marqué comme vu') },
        { label: 'Retirer de ma liste', icon: TrashIcon, onPress: () => toggle(title) },
      ],
    });

  return (
    <PosterGrid
      data={demoTitles}
      keyExtractor={(t) => t.id}
      paddingBottom={insets.bottom + 48}
      ListHeaderComponent={<Header insetTop={insets.top} />}
      renderPoster={(t, width) => (
        <Poster
          title={t}
          style={{ width }}
          badge={
            t.id === 'odyssey'
              ? { text: 'Au cinéma', highlight: true }
              : t.id === 'dune3'
                ? { text: '18 déc.' }
                : t.id === 'obaa'
                  ? { text: 'Apple TV+' }
                  : null
          }
          showAdd
          inList={inList[t.id] ?? false}
          onPress={() => showToast(`Ouvrir ${t.title}`)}
          onToggle={() => toggle(t)}
          onLongPress={() => filmSheet(t)}
        />
      )}
    />
  );
}

function Header({ insetTop }: { insetTop: number }) {
  const [tab, setTab] = useState<'movie' | 'tv' | 'anime'>('movie');
  const [segment, setSegment] = useState<'towatch' | 'watched'>('towatch');
  const [chip, setChip] = useState('all');
  const [switches, setSwitches] = useState({ a: true, b: false });
  const [watched, setWatched] = useState(false);
  const [sectionOpen, setSectionOpen] = useState(true);
  const [region, setRegion] = useState<Region>('CA');
  const [episodeIndex, setEpisodeIndex] = useState(0);
  const episode = demoEpisodes[episodeIndex % demoEpisodes.length] ?? demoEpisodes[0];

  if (!episode) return null;

  return (
    <View style={[styles.header, { paddingTop: insetTop }]}>
      <View style={styles.bar}>
        <Button
          variant="icon"
          height={44}
          icon={CaretLeftIcon}
          iconSize={22}
          color={colors.text}
          accessibilityLabel="Retour"
          onPress={() => router.back()}
        />
      </View>
      <ScreenHeader title="Ma liste" onSearch={() => showToast('Recherche')} />
      <ScreenHeader title="Profil" />
      <OfflineBannerView />

      <Section title="Boutons">
        <View style={styles.column}>
          <Button
            variant="primary"
            height={50}
            fontSize={15}
            icon={AppleLogoIcon}
            iconSize={20}
            iconWeight="fill"
            label="Continuer avec Apple"
          />
          <Button
            variant="secondary"
            height={50}
            fontSize={15}
            icon={GoogleLogoIcon}
            iconSize={20}
            label="Continuer avec Google"
          />
          <View style={styles.row}>
            <Button
              variant="primary"
              height={46}
              icon={PlusIcon}
              label="Ajouter à ma liste"
              style={styles.flex}
            />
            <Button
              variant="secondary"
              height={46}
              icon={EyeIcon}
              label="Marquer comme vu"
              style={styles.flex}
            />
          </View>
          <View style={styles.row}>
            <Button
              variant="secondary"
              height={34}
              fontSize={13}
              label="Commencer"
              style={styles.w112}
            />
            <Button variant="ghost" height={32} label="Voir plus" style={styles.ghostShift} />
            <Button
              variant="icon"
              bordered
              height={42}
              icon={SlidersHorizontalIcon}
              accessibilityLabel="Filtres"
            />
            <Button
              variant="ghost"
              height={36}
              fontSize={13}
              color={colors.neutral300}
              icon={SortAscendingIcon}
              iconSize={16}
              label="Date d'ajout"
            />
          </View>
          <Button variant="primary" height={50} fontSize={15} label="Aucun résultat" disabled />
        </View>
      </Section>

      <Section title="Onglets, segment, chips, interrupteurs" padded={false}>
        <UnderlineTabs
          tabs={[
            { key: 'movie', label: 'Films' },
            { key: 'tv', label: 'Séries' },
            { key: 'anime', label: 'Animés' },
          ]}
          value={tab}
          onChange={setTab}
        />
        <View style={[styles.row, styles.padded, styles.spaceBetween, styles.mt14]}>
          <Segmented
            options={[
              { key: 'towatch', label: 'À voir' },
              { key: 'watched', label: 'Vus' },
            ]}
            value={segment}
            onChange={setSegment}
          />
          <Switch
            value={switches.a}
            onValueChange={(a) => setSwitches((s) => ({ ...s, a }))}
            accessibilityLabel="Nouveaux épisodes"
          />
          <Switch
            value={switches.b}
            onValueChange={(b) => setSwitches((s) => ({ ...s, b }))}
            accessibilityLabel="Sorties en salle"
          />
        </View>
        <View style={[styles.row, styles.padded, styles.mt12]}>
          {[
            ['all', 'Tout'],
            ['mine', 'Sur mes plateformes'],
            ['cinema', 'Au cinéma'],
          ].map(([key, label]) => (
            <Chip
              key={key}
              label={label ?? ''}
              active={chip === key}
              onPress={() => setChip(key ?? 'all')}
            />
          ))}
        </View>
      </Section>

      <Section title="Carte « prochain épisode »">
        <NextEpisodeCard
          id="bear"
          seriesName="The Bear"
          episodeLabel={`${episodeCode(episode.season, episode.number)} · ${episode.name}`}
          remainingLabel={`${episode.remaining} épisodes restants`}
          progress={Math.round(((30 + episodeIndex) / 38) * 100)}
          stillKey={`bear${episode.season}-${episode.number}`}
          animationKey={String(episodeIndex)}
          onPress={() => showToast('Ouvrir The Bear, saison 4')}
          onCheck={() => {
            setEpisodeIndex((i) => i + 1);
            showToast('Épisode marqué comme vu', () => setEpisodeIndex((i) => Math.max(0, i - 1)));
          }}
          onAbandon={() => showToast('Série abandonnée', () => undefined)}
          onRemove={() => showToast('Retirée de ma liste', () => undefined)}
        />
        <NextEpisodeCard
          id="tv-severance"
          seriesName="Severance"
          episodeLabel="S02 E04 · Épisode 4"
          remainingLabel="Dernier épisode disponible"
          progress={90}
          stillKey="tv-severance2-4"
          spoilerBlur
          onPress={() => undefined}
          onCheck={() => showToast('Épisode marqué comme vu', () => undefined)}
          onAbandon={() => undefined}
          onRemove={() => undefined}
        />
        <View style={[styles.row, styles.mt12]}>
          <CheckButton watched={watched} onPress={() => setWatched((w) => !w)} />
          <Text style={styles.caption}>Coche d&apos;épisode (zone 44)</Text>
        </View>
      </Section>

      <Section title="Section repliable" padded={false}>
        <SectionHeader
          title="À regarder"
          count={3}
          open={sectionOpen}
          onToggle={() => setSectionOpen((o) => !o)}
        />
      </Section>

      <Section title="Notes et plateformes">
        <RatingChips imdbRating={8.5} imdbVotes={640_312} rtScore={92} />
        <RatingChips imdbRating={6.1} imdbVotes={1_412_000} rtScore={45} style={styles.mt12} />
        <View style={[styles.providers, styles.mt12]}>
          {demoProviders.map((p, i) => (
            <ProviderLogo
              key={p.id}
              provider={p}
              mine={i % 2 === 0}
              onPress={() => showToast(`Ouverture de ${p.name}…`)}
            />
          ))}
        </View>
      </Section>

      <Section title="Boutons ronds sur image">
        <View style={styles.backdrop}>
          <GradientFill gradientKey="odyssey" />
          <RoundIconButton
            icon={CaretLeftIcon}
            accessibilityLabel="Retour"
            onPress={() => undefined}
          />
          <View style={styles.row}>
            <RoundIconButton
              icon={BellRingingIcon}
              accessibilityLabel="Alertes"
              onPress={() => undefined}
            />
            <RoundIconButton
              icon={DotsThreeIcon}
              iconSize={22}
              accessibilityLabel="PlusIcon"
              onPress={() =>
                openActionSheet({
                  title: 'The Bear',
                  options: [
                    {
                      label: 'Abandonner',
                      icon: EyeSlashIcon,
                      onPress: () => showToast('Série abandonnée'),
                    },
                    {
                      label: 'Ne plus suivre',
                      icon: TrashIcon,
                      onPress: () => showToast('Série retirée'),
                    },
                  ],
                })
              }
            />
          </View>
        </View>
      </Section>

      <Section title="Sheets, dialogue, toast">
        <View style={styles.column}>
          <SelectField
            label="Région"
            value={region}
            onChange={setRegion}
            options={[
              { value: 'CA', label: 'Canada' },
              { value: 'FR', label: 'France' },
              { value: 'BE', label: 'Belgique' },
              { value: 'CH', label: 'Suisse' },
              { value: 'US', label: 'États-Unis' },
            ]}
          />
          <Button
            variant="secondary"
            height={46}
            label="Trier par (ActionSheet)"
            onPress={() =>
              openActionSheet({
                title: 'Trier par',
                options: [
                  { label: "Date d'ajout", icon: undefined, onPress: () => undefined },
                  { label: 'Date de sortie', icon: CircleIcon, onPress: () => undefined },
                ],
              })
            }
          />
          <Button
            variant="secondary"
            height={46}
            label="Se déconnecter (Dialog)"
            onPress={() =>
              openDialog({
                title: 'Se déconnecter ?',
                body: 'Ta liste reste sauvegardée sur ton compte.',
                actions: [
                  { label: 'Annuler', variant: 'secondary' },
                  {
                    label: 'Se déconnecter',
                    variant: 'primary',
                    onPress: () => showToast('Déconnecté'),
                  },
                ],
              })
            }
          />
          <Button
            variant="secondary"
            height={46}
            label="Toast avec Annuler"
            onPress={() => showToast('Épisode marqué comme vu', () => showToast('Annulé'))}
          />
        </View>
      </Section>

      <Section title="Squelettes">
        <View style={styles.row}>
          <SkeletonPoster style={styles.flex} />
          <SkeletonPoster style={styles.flex} />
          <SkeletonPoster style={styles.flex} />
        </View>
        <View style={[styles.column, styles.mt12]}>
          <SkeletonCard />
          <SkeletonSearchRow />
        </View>
      </Section>

      <Section title="État vide" padded={false}>
        <EmptyState
          icon={FilmStripIcon}
          title="Ta liste est vide"
          text="Ajoute des films pour les retrouver ici."
          action={{ label: 'Découvrir des films', onPress: () => undefined }}
        />
      </Section>

      <Section title="Carrousel (112) et lignes compactes (44)" padded={false}>
        <HorizontalCarousel
          data={demoTitles}
          keyExtractor={(t) => t.id}
          renderItem={(t) => (
            <View style={styles.carouselItem}>
              <Poster title={t} style={styles.w112} showAdd inList={false} />
              <Button variant="secondary" height={34} fontSize={13} label="Commencer" />
            </View>
          )}
        />
        <View style={[styles.padded, styles.mt12]}>
          <Poster
            title={demoTitles[8] ?? { id: '', title: '' }}
            showTitle={false}
            imageSize="w185"
            style={styles.w44}
          />
        </View>
      </Section>

      <Section title="Grille (PosterGrid)" />
    </View>
  );
}

function Section({
  title,
  padded = true,
  children,
}: {
  title: string;
  padded?: boolean;
  children?: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.overline, styles.padded]}>{title}</Text>
      <View style={padded ? styles.padded : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginHorizontal: -spacing.screenX,
    paddingBottom: 8,
  },
  bar: {
    paddingHorizontal: 8,
  },
  section: {
    marginTop: 24,
    gap: 8,
  },
  overline: {
    ...typography.overline,
  },
  padded: {
    paddingHorizontal: spacing.screenX,
  },
  column: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spaceBetween: {
    justifyContent: 'space-between',
  },
  flex: {
    flex: 1,
  },
  mt12: {
    marginTop: 12,
  },
  mt14: {
    marginTop: 14,
  },
  w112: {
    width: 112,
  },
  w44: {
    width: 44,
  },
  ghostShift: {
    marginLeft: -4,
  },
  caption: {
    ...typography.meta,
    color: colors.neutral400,
  },
  providers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  backdrop: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  carouselItem: {
    width: 112,
    gap: 6,
  },
});
