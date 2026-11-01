import type { Messages } from './fr';
import { core as core } from './core/en';
import { common as common } from './common/en';
import { watchlist as watchlist } from './watchlist/en';
import { discover as discover } from './discover/en';
import { search as search } from './search/en';
import { title as title } from './title/en';
import { social as social } from './social/en';
import { onboarding as onboarding } from './onboarding/en';
import { misc as misc } from './misc/en';

export const en: Messages = {
  ...core,
  ...common,
  ...watchlist,
  ...discover,
  ...search,
  ...title,
  ...social,
  ...onboarding,
  ...misc,
};
