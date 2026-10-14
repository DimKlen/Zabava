/**
 * Actions du Profil (specs/docs/09 §9.2) : préférences et plateformes enregistrées tout de
 * suite (mise à jour optimiste, retour à l'état d'avant si le serveur refuse), déconnexion
 * et suppression du compte avec confirmation.
 */
import { api } from '@/api/http';
import { profileKey, type Profile, type ProfileUpdate } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { signOut } from '@/api/session';
import { unregisterPushToken } from '@/lib/notifications';
import { openDialog, showToast } from '@/store/ui';

const SAVE_FAILED = "Impossible d'enregistrer, réessaie";

/** Envois du profil dans l'ordre des taps : un changement rapide ne passe pas devant l'autre. */
let queue: Promise<unknown> = Promise.resolve();

function enqueue(request: () => Promise<unknown>): Promise<unknown> {
  const next = queue.catch(() => undefined).then(request);
  queue = next;
  return next;
}

function currentProfile(): Profile | undefined {
  return queryClient.getQueryData<Profile>(profileKey);
}

/** Applique au cache, envoie, et restaure la valeur d'avant en cas d'échec. */
function optimistic(apply: (profile: Profile) => Profile, send: () => Promise<unknown>) {
  const before = currentProfile();
  if (!before) return Promise.resolve(false);
  queryClient.setQueryData<Profile>(profileKey, apply(before));
  return enqueue(send).then(
    () => true,
    () => {
      queryClient.setQueryData<Profile>(profileKey, (profile) =>
        profile ? restore(profile, before, apply) : profile,
      );
      showToast(SAVE_FAILED);
      return false;
    },
  );
}

/** Remet seulement ce que l'action a changé (un autre réglage a pu être modifié entre-temps). */
function restore(profile: Profile, before: Profile, apply: (profile: Profile) => Profile): Profile {
  const changed = apply(before);
  const result: Profile = { ...profile };
  for (const key of Object.keys(changed) as (keyof Profile)[]) {
    if (changed[key] !== before[key]) {
      (result as Record<string, unknown>)[key] = before[key];
    }
  }
  return result;
}

/** Préférence simple, optimiste : anti-spoiler, notifications, récapitulatif. */
export function updatePreference(
  update: Pick<ProfileUpdate, 'spoilerProtection' | 'notificationPrefs'>,
): Promise<boolean> {
  return optimistic(
    (profile) => ({
      ...profile,
      ...(update.spoilerProtection !== undefined
        ? { spoilerProtection: update.spoilerProtection }
        : {}),
      ...(update.notificationPrefs
        ? {
            notificationPrefs: {
              ...profile.notificationPrefs,
              ...stripUndefined(update.notificationPrefs),
            },
          }
        : {}),
    }),
    () => api<Profile>('/me/profile', { method: 'PUT', body: update }),
  );
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Tout sauf le profil : plateformes, dates de sortie et badges dépendent de la région. */
function invalidateCatalog(): void {
  void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'profile' });
}

/**
 * Région ou langue : pas d'affichage optimiste. Le serveur lit la région du profil
 * (plateformes, dates de sortie) : une requête partie avant l'enregistrement rangerait
 * des données de l'ancienne région sous la nouvelle. On attend donc la réponse, puis on
 * recharge tout le catalogue (plateformes des fiches, dates, badges, titres traduits).
 */
export async function changeRegionOrLanguage(
  update: Pick<ProfileUpdate, 'region' | 'language'>,
): Promise<boolean> {
  try {
    const profile = await enqueue(() =>
      api<Profile>('/me/profile', { method: 'PUT', body: update }),
    );
    queryClient.setQueryData<Profile>(profileKey, (current) =>
      current ? { ...current, ...update, ...(profile as Profile) } : (profile as Profile),
    );
  } catch {
    showToast(SAVE_FAILED);
    return false;
  }
  invalidateCatalog();
  return true;
}

/** Coche ou décoche une plateforme ; enregistré à chaque tap. */
export function toggleProvider(providerId: number): Promise<boolean> {
  const before = currentProfile()?.providerIds ?? [];
  const next = before.includes(providerId)
    ? before.filter((id) => id !== providerId)
    : [...before, providerId];
  return optimistic(
    (profile) => ({ ...profile, providerIds: next }),
    () => api<void>('/me/providers', { method: 'PUT', body: { providerIds: next } }),
  ).then((ok) => {
    // Badges « mes plateformes » et Découvrir › sur mes plateformes.
    if (ok) {
      void queryClient.invalidateQueries({ queryKey: ['discover'] });
      void queryClient.invalidateQueries({ queryKey: ['upcoming'] });
    }
    return ok;
  });
}

async function logOut(): Promise<void> {
  await unregisterPushToken();
  await signOut();
}

export function confirmSignOut(): void {
  openDialog({
    title: 'Se déconnecter ?',
    body: 'Ta liste reste sauvegardée sur ton compte.',
    actions: [
      { label: 'Annuler', variant: 'secondary' },
      { label: 'Se déconnecter', variant: 'primary', onPress: () => void logOut() },
    ],
  });
}

async function deleteAccount(): Promise<void> {
  try {
    await api<void>('/me', { method: 'DELETE' });
  } catch {
    showToast(SAVE_FAILED);
    return;
  }
  // Le compte n'existe plus : seule la session locale reste à effacer.
  await signOut();
}

export function confirmDeleteAccount(): void {
  openDialog({
    title: 'Supprimer ton compte ?',
    body: "Ta liste, ton suivi d'épisodes et tes réglages seront effacés définitivement.",
    actions: [
      { label: 'Annuler', variant: 'secondary' },
      { label: 'Supprimer', variant: 'primary', onPress: () => void deleteAccount() },
    ],
  });
}
