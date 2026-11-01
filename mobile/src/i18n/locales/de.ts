import type { Messages } from './fr';
import { core as core } from './core/de';
import { common as common } from './common/de';
import { watchlist as watchlist } from './watchlist/de';
import { discover as discover } from './discover/de';
import { search as search } from './search/de';
import { title as title } from './title/de';
import { social as social } from './social/de';
import { onboarding as onboarding } from './onboarding/de';
import { misc as misc } from './misc/de';

export const de: Messages = {
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
