import { useTitleSocial } from '@/api/social';
import { titleSocialView } from '@/domain/social/followingSummary';
import type { MediaType } from '@/domain/types';

import { FollowingCard } from './FollowingCard';
import { SawCarousel } from './SawCarousel';

type Props = { type: MediaType; tmdbId: number; title: string };

/**
 * Blocs sociaux sous « Où regarder » (specs/social/docs/04 §4.9). Rien pendant le chargement, pour
 * ne pas faire sauter la page, ni en cas d'erreur.
 */
export function TitleSocialBlocks({ type, tmdbId, title }: Props) {
  const social = useTitleSocial(type, tmdbId);
  if (!social.data) return null;
  const { following, saw, showsSaw } = titleSocialView(social.data);
  return (
    <>
      {following.length > 0 ? (
        <FollowingCard holders={following} type={type} title={title} />
      ) : null}
      {showsSaw ? <SawCarousel holders={saw} /> : null}
    </>
  );
}
