import type { Messages } from '../types';

export const misc: Messages<typeof import('./fr').misc> = {
  'misc.saveFailed': '保存できませんでした。もう一度お試しください',
  'misc.cancel': 'キャンセル',
  'misc.ok': 'OK',
  'misc.back': '戻る',
  'misc.signOut.title': 'ログアウトしますか？',
  'misc.signOut.body': 'リストはアカウントに保存されたままです。',
  'misc.deleteAccount.title': 'アカウントを削除しますか？',
  'misc.deleteAccount.body': 'リスト、エピソードの視聴記録、設定が完全に削除されます。',
  'misc.deleteAccount.confirm': '削除',
  'misc.platforms.search': 'サービスを検索',
  'misc.person.more': 'もっと見る',
  'misc.person.less': '閉じる',
  'misc.person.movies': '映画',
  'misc.person.series': 'シリーズ',
  'misc.person.sortPopular': '人気順',
  'misc.person.sortRecent': '新しい順',
  'misc.person.filmography': '出演作品',
  'misc.person.empty': 'このカテゴリーには作品がありません。',
  'misc.studio.empty': 'このスタジオのアニメはまだありません',
};
