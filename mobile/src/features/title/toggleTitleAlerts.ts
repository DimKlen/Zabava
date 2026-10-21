import { setTitleAlerts, type ListTitle } from '@/api/libraryActions';
import { askNotificationPermission } from '@/lib/notifications';

/**
 * Cloche d'une fiche. L'activer demande la permission système si elle n'a encore jamais
 * eu de réponse (« Plus tard » à l'onboarding, specs/docs/05 §5.3).
 */
export function toggleTitleAlerts(title: ListTitle, enabled: boolean): void {
  setTitleAlerts(title, enabled);
  if (enabled) void askNotificationPermission().catch(() => undefined);
}
