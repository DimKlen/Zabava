import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { CaretLeftIcon, GoogleLogoIcon, ImageIcon, TrashIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { isUploadedAvatar, pickAndUploadAvatar } from '@/api/avatar';
import { ApiError } from '@/api/http';
import { useProfile, useUpdateProfile, type Profile, type ProfileUpdate } from '@/api/profile';
import { useSessionStore } from '@/api/session';
import { requireOnline, SAVE_FAILED } from '@/api/socialActions';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { UsernameField } from '@/components/UsernameField';
import { canSubmitUsername } from '@/domain/social/username';
import { goBack } from '@/lib/navigation';
import { openActionSheet, openDialog, showToast } from '@/store/ui';
import { colors } from '@/theme/tokens';
import { fonts } from '@/theme/typography';

import { PrivateProfileCard } from './PrivateProfileCard';
import { useUsernameCheck } from './useUsernameCheck';

/** Un changement de pseudo tous les 30 jours (specs/social/docs/01 §2). */
const CHANGE_DELAY_MS = 30 * 24 * 60 * 60 * 1000;
const DISPLAY_NAME_MAX = 40;

/** Modifier le profil (specs/social/docs/04 §4.3). */
export function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const profile = useProfile().data;
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {profile?.username ? <EditForm profile={profile} username={profile.username} /> : null}
    </View>
  );
}

/** « Tu pourras changer de pseudo à partir du 22 novembre », ou null si c'est déjà possible. */
export function nextUsernameChange(changedAt: string | undefined, now: Date): string | null {
  if (!changedAt) return null;
  const next = new Date(new Date(changedAt).getTime() + CHANGE_DELAY_MS);
  if (next <= now) return null;
  const day = next.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' });
  return `Tu pourras changer de pseudo à partir du ${day}`;
}

function EditForm({ profile, username }: { profile: Profile; username: string }) {
  const navigation = useNavigation();
  const oauthAvatar = useSessionStore(
    (s) => (s.session?.user.user_metadata?.avatar_url as string | undefined) ?? null,
  );
  const [value, setValue] = useState(username);
  const [name, setName] = useState(profile.displayName ?? '');
  const [isPrivate, setPrivate] = useState(profile.isPrivate ?? false);
  const [avatar, setAvatar] = useState(profile.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const check = useUsernameCheck(value, username);
  const updateProfile = useUpdateProfile();
  // Enregistré : la garde de sortie est levée, puis l'écran se ferme (effet ci-dessous).
  const [saved, setSaved] = useState(false);

  const lockedUntil = nextUsernameChange(profile.usernameChangedAt, new Date());
  const changes: ProfileUpdate = {
    ...(value !== username ? { username: value } : {}),
    ...(name.trim() !== (profile.displayName ?? '') ? { displayName: name.trim() } : {}),
    ...(isPrivate !== (profile.isPrivate ?? false) ? { isPrivate } : {}),
    // Vide : retour à la photo du compte.
    ...(avatar !== (profile.avatarUrl ?? null) ? { avatarUrl: avatar ?? '' } : {}),
  };
  const dirty = Object.keys(changes).length > 0;
  const nameValid = name.trim().length > 0 && name.trim().length <= DISPLAY_NAME_MAX;
  const canSave =
    canSubmitUsername(check.status) && nameValid && !uploading && !updateProfile.isPending;

  // Modifications non enregistrées : confirmation avant de quitter.
  usePreventRemove(dirty && !saved, ({ data }) =>
    openDialog({
      title: 'Abandonner les modifications ?',
      actions: [
        { label: 'Continuer', variant: 'secondary' },
        {
          label: 'Abandonner',
          variant: 'primary',
          onPress: () => navigation.dispatch(data.action),
        },
      ],
    }),
  );

  useEffect(() => {
    if (saved) goBack();
  }, [saved]);

  const save = () => {
    if (!dirty) {
      goBack();
      return;
    }
    if (!requireOnline()) return;
    const accepted =
      profile.isPrivate && changes.isPrivate === false ? (profile.followRequestsCount ?? 0) : 0;
    updateProfile.mutate(changes, {
      onSuccess: () => {
        setSaved(true);
        showToast(
          accepted > 0
            ? accepted > 1
              ? `${accepted} demandes acceptées automatiquement`
              : '1 demande acceptée automatiquement'
            : 'Profil mis à jour',
        );
      },
      onError: (error) => {
        if (error instanceof ApiError && (error.status === 409 || error.status === 422)) {
          check.recheck();
        } else {
          showToast(SAVE_FAILED);
        }
      },
    });
  };

  const choosePhoto = async () => {
    if (!requireOnline() || !profile.id) return;
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(profile.id);
      if (url) setAvatar(url);
    } catch {
      showToast(SAVE_FAILED);
    } finally {
      setUploading(false);
    }
  };

  const photoMenu = () =>
    openActionSheet({
      title: 'Photo de profil',
      options: [
        ...(oauthAvatar
          ? [
              {
                label: 'Photo de mon compte Google',
                icon: GoogleLogoIcon,
                onPress: () => setAvatar(oauthAvatar),
              },
            ]
          : []),
        {
          label: 'Choisir dans la bibliothèque',
          icon: ImageIcon,
          onPress: () => void choosePhoto(),
        },
        ...(isUploadedAvatar(avatar)
          ? [
              {
                label: 'Supprimer la photo',
                icon: TrashIcon,
                onPress: () => setAvatar(oauthAvatar),
              },
            ]
          : []),
      ],
    });

  return (
    <>
      <View style={styles.bar}>
        <Button
          variant="icon"
          height={44}
          icon={CaretLeftIcon}
          iconSize={22}
          color={colors.text}
          accessibilityLabel="Retour"
          onPress={goBack}
        />
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          Modifier le profil
        </Text>
        <Button
          variant="ghost"
          height={44}
          label="Enregistrer"
          disabled={!canSave}
          onPress={save}
          style={styles.save}
        />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.photo}>
          <Avatar size={88} name={name || username} uri={avatar} mine />
          <Button
            variant="ghost"
            height={44}
            label={uploading ? 'Envoi de la photo…' : 'Changer la photo'}
            disabled={uploading}
            onPress={photoMenu}
          />
        </View>
        <View>
          <Text style={styles.label}>Pseudo</Text>
          <UsernameField
            value={value}
            onChange={setValue}
            status={check.status}
            suggestions={check.suggestions}
            editable={!lockedUntil}
          />
          <Text style={styles.help}>
            {lockedUntil ??
              "Modifiable une fois tous les 30 jours. L'ancien pseudo reste réservé 30 jours."}
          </Text>
        </View>
        <View>
          <Text style={styles.label}>Nom affiché</Text>
          <TextField
            height={48}
            value={name}
            onChangeText={setName}
            maxLength={DISPLAY_NAME_MAX}
            autoCapitalize="words"
            accessibilityLabel="Nom affiché"
          />
        </View>
        <PrivateProfileCard value={isPrivate} onChange={setPrivate} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  title: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 18,
    lineHeight: 18 * 1.3,
    color: colors.text,
  },
  save: {
    paddingHorizontal: 8,
  },
  content: {
    gap: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  photo: {
    alignItems: 'center',
    gap: 4,
  },
  label: {
    marginBottom: 5,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.3,
    color: colors.textA70,
  },
  help: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 12 * 1.4,
    color: colors.neutral500,
  },
});
