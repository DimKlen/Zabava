import type { Messages } from './fr';
import { core as core } from './core/es';
import { common as common } from './common/es';
import { watchlist as watchlist } from './watchlist/es';
import { discover as discover } from './discover/es';
import { search as search } from './search/es';
import { title as title } from './title/es';
import { social as social } from './social/es';
import { onboarding as onboarding } from './onboarding/es';
import { misc as misc } from './misc/es';

export const es: Messages = {
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
