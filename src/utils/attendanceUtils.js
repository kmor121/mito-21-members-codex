/**
 * 出欠受付が終了しているかどうか判定する
 * - attendance_closed が true → 終了
 * - attendance_deadline または rsvp_deadline が設定されていて、期限を過ぎている → 終了
 */
export function isAttendanceClosed(item) {
  if (!item) return false;
  if (item.attendance_closed === true) return true;
  const dl = item.attendance_deadline || item.rsvp_deadline;
  if (dl) {
    const deadline = new Date(dl);
    deadline.setHours(23, 59, 59, 999);
    if (new Date() > deadline) return true;
  }
  return false;
}

/**
 * 出欠期限の値を取得する（Meeting: attendance_deadline, Event: rsvp_deadline）
 */
export function getDeadline(item) {
  if (!item) return '';
  return item.attendance_deadline || item.rsvp_deadline || '';
}
