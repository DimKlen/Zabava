import type { Messages } from './fr';
import { core as core } from './core/ja';
import { common as common } from './common/ja';
import { watchlist as watchlist } from './watchlist/ja';
import { discover as discover } from './discover/ja';
import { search as search } from './search/ja';
import { title as title } from './title/ja';
import { social as social } from './social/ja';
import { onboarding as onboarding } from './onboarding/ja';
import { misc as misc } from './misc/ja';

export const ja: Messages = {
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
