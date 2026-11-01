import type { Messages } from './fr';
import { core as core } from './core/pt';
import { common as common } from './common/pt';
import { watchlist as watchlist } from './watchlist/pt';
import { discover as discover } from './discover/pt';
import { search as search } from './search/pt';
import { title as title } from './title/pt';
import { social as social } from './social/pt';
import { onboarding as onboarding } from './onboarding/pt';
import { misc as misc } from './misc/pt';

export const pt: Messages = {
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
