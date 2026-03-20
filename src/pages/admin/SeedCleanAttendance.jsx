import { useState } from 'react';
import { base44 } from '../../api/base44Client';

export default function SeedCleanAttendance() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setResult('読み込み中...');
    try {
      const atts = await base44.entities.Attendance.list();
      const lines = [];
      const toDelete = [];
      const seen = new Map();

      for (const a of atts) {
        const key = `${a.event_id || a.meeting_id}_${a.member_id}`;
        lines.push(`ID:${a.id} event:${a.event_id || '-'} meeting:${a.meeting_id || '-'} member:${a.member_id || '(空)'} response:${a.response || a.status || '(なし)'}`);

        if (!a.member_id) {
          toDelete.push(a);
          continue;
        }

        if (seen.has(key)) {
          toDelete.push(a);
        } else {
          seen.set(key, a);
        }
      }

      lines.push(`\n--- 合計: ${atts.length}件 ---`);
      lines.push(`--- 削除対象: ${toDelete.length}件 ---`);
      toDelete.forEach(a => {
        lines.push(`  削除: ID:${a.id} event:${a.event_id || '-'} member:${a.member_id || '(空)'} response:${a.response}`);
      });

      for (const a of toDelete) {
        await base44.entities.Attendance.delete(a.id);
        lines.push(`  ✓ 削除完了: ${a.id}`);
      }

      setResult(lines.join('\n'));
    } catch (err) {
      setResult(`エラー: ${err.message}`);
    }
    setLoading(false);
  }

  return (
    <section className="admin-shell" style={{ padding: 24 }}>
      <h1>Attendance クリーンアップ</h1>
      <p>member_idが空のレコードと重複レコードを検出・削除します。</p>
      <button onClick={run} disabled={loading} className="btn btn-primary" style={{ marginBottom: 16 }}>
        {loading ? '実行中...' : '実行'}
      </button>
      <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, fontSize: 12, whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
        {result || 'ボタンを押して実行してください'}
      </pre>
    </section>
  );
}
