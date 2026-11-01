import type { Messages } from '../types';

export const discover: Messages<typeof import('./fr').discover> = {
  'discover.title': '見つける',
  'discover.tabs.movie': '映画',
  'discover.tabs.tv': 'シリーズ',
  'discover.tabs.anime': 'アニメ',
  'discover.offline.title': 'オフラインでは「見つける」を使えません',
  'discover.offline.text': 'マイリストと公開予定はキャッシュから引き続き見られます。',
  'discover.genre.title': 'ジャンル別',
  'discover.genre.back': '戻る',
  'discover.genre.empty': 'このジャンルの作品はまだありません',
  'discover.genre.mine': '自分のサービスで',
  'discover.genre.rating': '評価 {min}+',
};
