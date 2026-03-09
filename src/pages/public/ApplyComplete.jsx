import { Link } from 'react-router-dom';

export default function ApplyComplete() {
  return (
    <section className="application-layout stack">
      <div className="page-header">
        <h1 className="page-title">申込を受け付けました</h1>
        <p className="page-description">内容を確認のうえ、承認後にご連絡いたします</p>
      </div>
      <section className="detail-card stack-sm">
        <p className="message success">受付処理は完了しました。必要な連絡がある場合のみ、後日ご案内します。</p>
        <div className="actions application-actions">
          <Link className="button" to="/">公開トップ</Link>
          <Link className="button ghost" to="/apply">新規申込</Link>
          <Link className="text-link subtle-link" to="/directory">名簿</Link>
        </div>
      </section>
    </section>
  );
}
