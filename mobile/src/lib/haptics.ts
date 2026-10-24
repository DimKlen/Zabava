import * as Haptics from 'expo-haptics';

/** Retour haptique léger : coche d'un épisode, ajout pendant l'onboarding. */
export function hapticLight(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Retour haptique moyen : appui long sur une affiche. */
export function hapticMedium(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
}

/** Retour haptique de réussite : code Zabava reconnu par le scanner. */
export function hapticSuccess(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
