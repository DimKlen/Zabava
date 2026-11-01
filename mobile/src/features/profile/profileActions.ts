/**
 * Actions du Profil (specs/docs/09 §9.2) : préférences et plateformes enregistrées tout de
 * suite (mise à jour optimiste, retour à l'état d'avant si le serveur refuse), déconnexion
 * et suppression du compte avec confirmation.
 */
import { api } from '@/api/http';
import { profileKey, type Profile, type ProfileUpdate } from '@/api/profile';
import { queryClient } from '@/api/queryClient';
import { signOut } from '@/api/session';
import { currentLanguage, t, useLanguageStore, type LanguagePreference } from '@/i18n';
import { toggleGroup, type ProviderGroup } from '@/domain/providers';
import { unregisterPushToken } from '@/lib/notifications';
import { openDialog, showToast } from '@/store/ui';

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
      showToast(t('misc.saveFailed'));
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

/** Tout sauf le profil : titres, descriptions, dates et badges dépendent de la langue et de la région. */
function invalidateCatalog(): void {
  void queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== 'profile' });
}

/**
 * Langue ou région : pas d'affichage optimiste. Le serveur les lit dans le profil : une requête
 * partie avant l'enregistrement rangerait des données de l'ancien réglage sous le nouveau. On
 * attend donc la réponse, puis on recharge tout le catalogue (textes traduits, dates de sortie,
 * classifications et badges de la région).
 */
export async function changeCatalogSetting(
  update: Pick<ProfileUpdate, 'language' | 'region'>,
): Promise<boolean> {
  try {
    const profile = await enqueue(() =>
      api<Profile>('/me/profile', { method: 'PUT', body: update }),
    );
    queryClient.setQueryData<Profile>(profileKey, (current) =>
      current ? { ...current, ...update, ...(profile as Profile) } : (profile as Profile),
    );
  } catch {
    showToast(t('misc.saveFailed'));
    return false;
  }
  invalidateCatalog();
  return true;
}

/**
 * Choix de la langue de l'app (« auto » : celle du téléphone). Le catalogue suit : la langue
 * effective est enregistrée dans le profil, d'où TMDB renvoie titres et descriptions. Si
 * l'enregistrement échoue, le choix d'avant revient.
 */
export async function chooseLanguage(preference: LanguagePreference): Promise<boolean> {
  const { preference: before, setPreference } = useLanguageStore.getState();
  setPreference(preference);
  const ok = await changeCatalogSetting({ language: currentLanguage() });
  if (!ok) setPreference(before);
  return ok;
}

/** Coche ou décoche une plateforme (toutes ses formules) ; enregistré à chaque tap. */
export function toggleProvider(group: ProviderGroup): Promise<boolean> {
  const next = toggleGroup(currentProfile()?.providerIds ?? [], group);
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
    title: t('misc.signOut.title'),
    body: t('misc.signOut.body'),
    actions: [
      { label: t('misc.cancel'), variant: 'secondary' },
      { label: t('settings.signOut'), variant: 'primary', onPress: () => void logOut() },
    ],
  });
}

async function deleteAccount(): Promise<void> {
  try {
    await api<void>('/me', { method: 'DELETE' });
  } catch {
    showToast(t('misc.saveFailed'));
    return;
  }
  // Le compte n'existe plus : seule la session locale reste à effacer.
  await signOut();
}

export function confirmDeleteAccount(): void {
  openDialog({
    title: t('misc.deleteAccount.title'),
    body: t('misc.deleteAccount.body'),
    actions: [
      { label: t('misc.cancel'), variant: 'secondary' },
      {
        label: t('misc.deleteAccount.confirm'),
        variant: 'primary',
        onPress: () => void deleteAccount(),
      },
    ],
  });
}
