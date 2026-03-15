/**
 * 会員名の表示フォーマット
 * 全画面でこのヘルパーを使い、表示形式を一元管理する
 *
 * Uses split fields: last_name / first_name / last_name_kana / first_name_kana.
 */

/** フルネーム（スペース区切り）: 名簿、テーブル、カード等 */
export function fullName(member) {
  if (!member) return '';
  return `${member.last_name || ''} ${member.first_name || ''}`.trim();
}

/** フルネーム（ふりがな） */
export function fullNameKana(member) {
  if (!member) return '';
  return `${member.last_name_kana || ''} ${member.first_name_kana || ''}`.trim();
}

/** グリーティング: マイページ等 */
export function greetingName(member) {
  if (!member) return '';
  return `${member.last_name || ''}さん`;
}

/** フォーマル: メール宛名、正式書類 */
export function formalName(member) {
  if (!member) return '';
  return `${fullName(member)} 様`.trim();
}

/** 姓のみ: ソート用、短縮表示 */
export function lastName(member) {
  return member?.last_name || '';
}

/** イニシャル: アバター表示用 */
export function nameInitial(member) {
  if (!member) return '?';
  return (member.last_name || '?').charAt(0);
}
