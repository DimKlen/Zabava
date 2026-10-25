import { useTitleSocial } from '@/api/social';
import { friendsOnTitle } from '@/domain/social/followingSummary';
import type { MediaType } from '@/domain/types';

import { FollowingCard } from './FollowingCard';

type Props = { type: MediaType; tmdbId: number; title: string };

/**
 * « Tes amis » sous « Où regarder » (specs/social/docs/04 §4.9). Rien pendant le chargement, pour
 * ne pas faire sauter la page, ni en cas d'erreur.
 */
export function TitleSocialBlocks({ type, tmdbId, title }: Props) {
  const social = useTitleSocial(type, tmdbId);
  if (!social.data) return null;
  const friends = friendsOnTitle(social.data);
  return friends.length > 0 ? <FollowingCard holders={friends} type={type} title={title} /> : null;
}
