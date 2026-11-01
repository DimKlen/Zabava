import type { Messages } from './fr';
import { core as core } from './core/it';
import { common as common } from './common/it';
import { watchlist as watchlist } from './watchlist/it';
import { discover as discover } from './discover/it';
import { search as search } from './search/it';
import { title as title } from './title/it';
import { social as social } from './social/it';
import { onboarding as onboarding } from './onboarding/it';
import { misc as misc } from './misc/it';

export const it: Messages = {
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
