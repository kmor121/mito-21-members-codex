/**
 * 出欠受付が終了しているかどうか判定する
 * - attendance_closed が true → 終了
 * - attendance_deadline が設定されていて、期限を過ぎている → 終了
 */
export function isAttendanceClosed(item) {
  if (!item) return false;
  if (item.attendance_closed === true) return true;
  if (item.attendance_deadline) {
    const deadline = new Date(item.attendance_deadline);
    deadline.setHours(23, 59, 59, 999);
    if (new Date() > deadline) return true;
  }
  return false;
}
