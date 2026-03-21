import { useState, useEffect, useMemo } from 'react';
import { base44 } from '../../api/base44Client';
import { ChevronDown, FileText } from 'lucide-react';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { PageHeader } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function ManualCard({ manual, index }) {
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
    : null;

  return (
    <article
      className="basic-info-document fade-slide-in"
      style={{ animationDelay: `${Math.min(index, 10) * 0.04}s` }}
    >
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

function ManualCategoryGroup({ title, items, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="manual-category-group">
      <button
        type="button"
        className="manual-category-toggle"
        onClick={() => setIsOpen((v) => !v)}
      >
        <h3 className="manual-category-title" style={{ marginBottom: 0, borderBottom: "none", paddingBottom: 0 }}>
          {title}
          <span className="manual-category-count">{items.length}</span>
        </h3>
        <ChevronDown
          size={18}
          style={{
            color: "var(--color-text-secondary)",
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>
      {isOpen && (
        <div className="manual-list" style={{ marginTop: 12 }}>
          {items.map((manual, idx) => (
            <ManualCard key={idx} manual={manual} index={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Manual() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manuals, setManuals] = useState([]);

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('M6-運用マニュアル'); } catch (e) { /* analytics */ } }, []);
  useEffect(() => {
    setLoading(true);
    setError("");

    base44.entities.OrgDocument.filter({ published: true, doc_type: "運用マニュアル" }, "sort_order")
      .then((list) => {
        setManuals(list);
      })
      .catch((err) => {
        setError(err.message || "運用マニュアルの取得に失敗しました。");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
        <PageHeader title="運用マニュアル" subtitle="公開中の運用マニュアルを確認" />
        <div style={{ display: "grid", gap: 16 }}>
          <SkeletonCard height={100} />
          <SkeletonCard height={100} />
          <SkeletonCard height={100} />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <PageHeader title="運用マニュアル" subtitle="公開中の運用マニュアルを確認" />
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <PageHeader title="運用マニュアル" subtitle="公開中の運用マニュアルを確認" />
      <section className="card panel-card single-panel">
        <div className="card-body stack">
          {manuals.length ? (
            <>
              {categoryGroups.map(([cat, items], idx) => (
                <ManualCategoryGroup key={cat} title={cat} items={items} defaultOpen={idx === 0} />
              ))}
              {uncategorized.length > 0 && (
                <ManualCategoryGroup title="その他" items={uncategorized} defaultOpen={categoryGroups.length === 0} />
              )}
            </>
          ) : (
            <div className="empty-state-enhanced">
              <FileText size={32} style={{ color: "var(--color-text-tertiary)", marginBottom: 8 }} />
              <p style={{ fontWeight: 600, color: "var(--color-text-primary)", margin: "0 0 4px" }}>運用マニュアルはまだ登録されていません</p>
              <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>管理者がマニュアルを公開すると、ここに表示されます</p>
            </div>
          )}
        </div>
      </section>
      {isMobile && (
        <style>{`
          .card-body { padding: 12px !important; }
          .basic-info-document { padding: 12px !important; }
        `}</style>
      )}
    </section>
  );
}
