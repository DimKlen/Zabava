import { UsernameScreen } from '@/features/onboarding/UsernameScreen';

/** Comptes créés avant la partie sociale : pseudo à choisir une fois, en plein écran. */
export default function UsernameRequired() {
  return <UsernameScreen variant="required" />;
}
