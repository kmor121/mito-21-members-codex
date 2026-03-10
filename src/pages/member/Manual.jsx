import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

function ManualCard({ manual }) {
  const content = manual.content
    ? <div className="basic-info-content" dangerouslySetInnerHTML={{ __html: manual.content }} />
    : <p className="muted">本文は登録されていません。</p>;

  const attachment = manual.attachment?.url
    ? (
      <div className="actions">
        <a className="text-link" href={manual.attachment.url} target="_blank" rel="noreferrer">
          添付を見る: {manual.attachment.label || "添付ファイル"}
        </a>
      </div>
    )
    : <p className="muted">添付ファイルはありません。</p>;

  return (
    <article className="basic-info-document">
      <div className="panel-heading compact">
        <div>
          <h2>{displayValue(manual.title)}</h2>
        </div>
        {manual.updated_at && <span className="pill">{manual.updated_at.slice(0, 10)}</span>}
      </div>
      {content}
      {attachment}
    </article>
  );
}

function ManualCategoryGroup({ title, items }) {
  return (
    <div className="manual-category-group">
      <h3 className="manual-category-title">{title}</h3>
      <div className="manual-list">
        {items.map((manual, idx) => (
          <ManualCard key={idx} manual={manual} />
        ))}
      </div>
    </div>
  );
}

export default function Manual() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manuals, setManuals] = useState([]);

  useEffect(() => {
    setLoading(true);
    setError("");

    apiRequest("get-member-manual")
      .then((result) => {
        const raw = result.manuals;
        setManuals(Array.isArray(raw) ? raw : []);
      })
      .catch((err) => {
        setError(err.message || "運用マニュアルの取得に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Group by category — must be before any early returns to satisfy Rules of Hooks
  const { categoryGroups, uncategorized } = useMemo(() => {
    const catMap = new Map();
    const uncat = [];
    for (const manual of manuals) {
      const cat = String(manual.category || "").trim();
      if (cat) {
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat).push(manual);
      } else {
        uncat.push(manual);
      }
    }
    const groups = [...catMap.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], "ja")
    );
    return { categoryGroups: groups, uncategorized: uncat };
  }, [manuals]);

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">運用マニュアル</h1>
          <p className="page-description">公開中の運用マニュアルを確認</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body">
            <LoadingSpinner />
          </div>
        </section>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">運用マニュアル</h1>
          <p className="page-description">公開中の運用マニュアルを確認</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
            <div className="actions">
              <Link className="text-link" to="/directory">会員名簿へ</Link>
              <Link className="text-link" to="/info">基本情報へ</Link>
              <Link className="text-link" to="/organization">組織図へ</Link>
            </div>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">運用マニュアル</h1>
        <p className="page-description">公開中の運用マニュアルを確認</p>
      </div>
      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading"><div><h2>マニュアル一覧</h2></div></div>
          {manuals.length ? (
            <>
              {categoryGroups.map(([cat, items]) => (
                <ManualCategoryGroup key={cat} title={cat} items={items} />
              ))}
              {uncategorized.length > 0 && (
                <ManualCategoryGroup title="その他" items={uncategorized} />
              )}
            </>
          ) : (
            <p className="empty-state">公開中の運用マニュアルはまだ登録されていません。</p>
          )}
        </div>
      </section>
    </section>
  );
}
