import { core as core } from './core/fr';
import { common as common } from './common/fr';
import { watchlist as watchlist } from './watchlist/fr';
import { discover as discover } from './discover/fr';
import { search as search } from './search/fr';
import { title as title } from './title/fr';
import { social as social } from './social/fr';
import { onboarding as onboarding } from './onboarding/fr';
import { misc as misc } from './misc/fr';

export const fr = {
  ...core,
  ...common,
  ...watchlist,
  ...discover,
  ...search,
  ...title,
  ...social,
  ...onboarding,
  ...misc,
} as const;

export type MessageKey = keyof typeof fr;
export type Messages = Record<MessageKey, string>;
