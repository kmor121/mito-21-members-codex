import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { base44 } from '../../api/base44Client';
import { ChevronDown, FileText } from 'lucide-react';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { PageHeader, Card } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

function ManualCard({ manual }) {
  const content = manual.content
    ? (
      <div
        className="tiptap-content-view"
        style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--color-text-secondary)' }}
        dangerouslySetInnerHTML={{ __html: manual.content }}
      />
    )
    : <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-tertiary)' }}>本文は登録されていません。</p>;

  const attachment = manual.attachment?.url
    ? (
      <div style={{ marginTop: 'var(--space-3)' }}>
        <a
          href={manual.attachment.url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)' }}
        >
          添付を見る: {manual.attachment.label || "添付ファイル"}
        </a>
      </div>
    )
    : null;

  return (
    <div style={{ padding: '16px 20px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: manual.content || manual.attachment?.url ? 'var(--space-3)' : 0,
      }}>
        <h4 style={{
          margin: 0, fontSize: 15,
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--color-text-primary)',
        }}>
          {manual.title || '-'}
        </h4>
        {manual.updated_at && (
          <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
            {manual.updated_at.slice(0, 10)}
          </span>
        )}
      </div>
      {content}
      {attachment}
    </div>
  );
}

export default function Manual() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manuals, setManuals] = useState([]);
  const [openSections, setOpenSections] = useState({});
  const sectionRefs = useRef({});

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('M6-運用マニュアル'); } catch (e) { /* analytics */ } }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    base44.entities.OrgDocument.filter({ published: true, doc_type: "運用マニュアル" }, "sort_order")
      .then((list) => setManuals(list))
      .catch((err) => setError(err.message || "運用マニュアルの取得に失敗しました。"))
      .finally(() => setLoading(false));
  }, []);

  const allSections = useMemo(() => {
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
    const groups = [...catMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ja"))
      .map(([cat, items]) => ({ key: cat, title: cat, items }));
    if (uncat.length > 0) {
      groups.push({ key: "__uncategorized__", title: "その他", items: uncat });
    }
    return groups;
  }, [manuals]);

  // Open first section by default
  useEffect(() => {
    if (allSections.length > 0 && Object.keys(openSections).length === 0) {
      setOpenSections({ [allSections[0].key]: true });
    }
  }, [allSections]);

  const toggleSection = useCallback((key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const scrollToSection = useCallback((key) => {
    setOpenSections(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

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
        <Card><p className="message error">{error}</p></Card>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <PageHeader title="運用マニュアル" subtitle="公開中の運用マニュアルを確認" />

      {manuals.length ? (
        <>
          {/* Table of Contents */}
          {allSections.length > 1 && (
            <Card
              style={{ background: 'var(--color-bg-sub)', marginBottom: 'var(--space-5)' }}
              padding="16px 20px"
            >
              <div style={{
                fontSize: 14,
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-2)',
                color: 'var(--color-text-primary)',
              }}>
                目次
              </div>
              {allSections.map((section, idx) => (
                <div
                  key={section.key}
                  onClick={() => scrollToSection(section.key)}
                  style={{
                    fontSize: 14,
                    color: 'var(--color-accent)',
                    cursor: 'pointer',
                    padding: '6px 0',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  {idx + 1}. {section.title}
                </div>
              ))}
            </Card>
          )}

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {allSections.map((section, idx) => {
              const isOpen = !!openSections[section.key];
              return (
                <Card key={section.key} padding="0" style={{ overflow: 'hidden' }}>
                  <div ref={el => { sectionRefs.current[section.key] = el; }} />
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                      fontSize: 16,
                      fontWeight: 'var(--font-weight-bold)',
                      color: 'var(--color-text-primary)',
                      padding: '16px 20px',
                      background: 'var(--color-bg-sub)',
                      border: 'none',
                      borderBottom: isOpen ? '1px solid var(--color-border)' : '1px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span>
                      <span style={{ color: 'var(--color-accent)' }}>{idx + 1}.</span>
                      {' '}{section.title}
                    </span>
                    <ChevronDown
                      size={18}
                      style={{
                        color: 'var(--color-text-secondary)',
                        transition: 'transform 0.2s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        flexShrink: 0,
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div>
                      {section.items.map((manual, mIdx) => (
                        <div key={mIdx}>
                          {mIdx > 0 && (
                            <div style={{ borderTop: '1px solid var(--color-border)', margin: '0 20px' }} />
                          )}
                          <ManualCard manual={manual} />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FileText size={32} style={{ color: 'var(--color-text-tertiary)', marginBottom: 8 }} />
          <p style={{
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-text-primary)',
            margin: '0 0 4px',
          }}>
            運用マニュアルはまだ登録されていません
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            管理者がマニュアルを公開すると、ここに表示されます
          </p>
        </div>
      )}
    </section>
  );
}
