import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { Card } from '../../components/ui';
import { useIsMobile } from '../../hooks/useIsMobile';

function formatFiscalYearLabel(fiscalYear) {
  if (!fiscalYear || !fiscalYear.year) return "年度未設定";
  return `${fiscalYear.year}年度`;
}

function BasicInfoDocument({ doc }) {
  const content = doc.content
    ? <div className="basic-info-content" dangerouslySetInnerHTML={{ __html: doc.content }} />
    : <p className="muted">本文は登録されていません。</p>;

  const attachment = doc.attachment?.url
    ? (
      <div className="actions">
        <a className="text-link" href={doc.attachment.url} target="_blank" rel="noreferrer">
          添付を見る: {doc.attachment.label || "添付ファイル"}
        </a>
      </div>
    )
    : <p className="muted">添付ファイルはありません。</p>;

  return (
    <article className="basic-info-document">
      <div className="panel-heading compact">
        <div>
          <h3>{doc.title || "無題"}</h3>
        </div>
        {doc.updated_at && <span className="pill">{doc.updated_at.slice(0, 10)}</span>}
      </div>
      {content}
      {attachment}
    </article>
  );
}

export default function BasicInfo() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearIdParam = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [years, setYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => { try { base44.appLogs?.logUserInApp?.('M4-基本情報'); } catch (e) { /* analytics */ } }, []);
  useEffect(() => {
    setLoading(true);
    setError("");

    (async () => {
      try {
        const [yearsList, allDocs] = await Promise.all([
          base44.entities.FiscalYear.list("-year"),
          base44.entities.OrgDocument.filter({ published: true }, "sort_order"),
        ]);

        const currentFy = yearsList.find((fy) => fy.is_current === true);
        const effectiveId = fiscalYearIdParam || currentFy?.id || "";
        const selectedFy = yearsList.find((fy) => fy.id === effectiveId) || null;

        const DOC_SECTIONS = [
          { key: "事業計画", label: "事業計画" },
          { key: "団体理念", label: "団体理念" },
          { key: "会則・規約", label: "会則・規約" },
          { key: "年間スケジュール", label: "年間スケジュール" },
        ];

        const sectionsList = DOC_SECTIONS.map((sec) => ({
          ...sec,
          documents: allDocs
            .filter((d) => d.doc_type === sec.key && (!d.fiscal_year_id || d.fiscal_year_id === effectiveId))
            .map((d) => ({
              title: d.title,
              content: d.content,
              attachment: d.attachment ? { url: d.attachment, label: "添付ファイル" } : null,
              updated_at: d.updated_date || d.created_date || "",
            })),
        }));

        setYears(yearsList);
        setSelectedFiscalYear(selectedFy);
        setSections(sectionsList);
        setActiveTab(sectionsList[0]?.key || "事業計画");
      } catch (err) {
        setError(err.message || "基本情報の取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    })();
  }, [fiscalYearIdParam]);

  function handleFiscalYearChange(e) {
    const value = String(e.target.value || "").trim();
    if (value) {
      setSearchParams({ fiscalYearId: value });
    } else {
      setSearchParams({});
    }
  }

  function handleTabClick(key) {
    setActiveTab(key);
  }

  const selectedFiscalYearId = selectedFiscalYear?.id || "";

  if (loading) {
    return (
      <section className="admin-shell">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 22, fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>基本情報</h1>
        </div>
        <LoadingSpinner />
      </section>
    );
  }

  if (error) {
    return (
      <section className="admin-shell">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 22, fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>基本情報</h1>
        </div>
        <Card>
          <p className="message error">{error}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <Link className="text-link" to="/directory">会員名簿へ</Link>
            <Link className="text-link" to="/mypage">マイページへ</Link>
          </div>
        </Card>
      </section>
    );
  }

  const activeSection = sections.find(s => s.key === activeTab);
  const activeDocs = activeSection?.documents || [];

  return (
    <section className="admin-shell">
      {/* Header: title + compact year select */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 22, fontWeight: 'var(--font-weight-bold)', color: 'var(--color-text-primary)' }}>基本情報</h1>
          {!isMobile && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-tertiary)' }}>年度ごとの事業計画・理念・会則・年間スケジュール</p>}
        </div>
        {years.length > 0 && (
          <div className="binfo-select-wrap">
            <select
              value={selectedFiscalYearId}
              onChange={handleFiscalYearChange}
              className="binfo-fy-select"
            >
              {years.map((fy) => (
                <option key={fy.id} value={fy.id}>
                  {formatFiscalYearLabel(fy)}{fy.is_current ? " ●" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!years.length && (
        <p style={{ fontSize: 14, color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '40px 20px' }}>
          年度が未登録のため、表示対象の年度を決められません。管理画面で年度を登録すると切替表示できます。
        </p>
      )}

      {/* Tabs: flat underline style */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-4)',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {sections.map((section) => {
          const isActive = section.key === activeTab;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => handleTabClick(section.key)}
              style={{
                padding: isMobile ? '10px 12px' : '10px 14px',
                fontSize: 14,
                fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
                color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                borderRadius: 0,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'color var(--transition-fast), border-color var(--transition-fast)',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeDocs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {activeDocs.map((doc, idx) => (
            <Card key={idx} padding="var(--space-5)">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: doc.content || doc.attachment?.url ? 'var(--space-3)' : 0 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>{doc.title || "無題"}</h3>
                {doc.updated_at && <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>{doc.updated_at.slice(0, 10)}</span>}
              </div>
              {doc.content && (
                <div
                  className="tiptap-content-view"
                  style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-text-primary)' }}
                  dangerouslySetInnerHTML={{ __html: doc.content }}
                />
              )}
              {!doc.content && <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-tertiary)' }}>本文は登録されていません。</p>}
              {doc.attachment?.url && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <a
                    href={doc.attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 'var(--font-weight-medium)' }}
                  >
                    添付を見る: {doc.attachment.label || "添付ファイル"}
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-tertiary)', fontSize: 14 }}>
          {activeSection?.label || 'このセクション'}はまだ公開されていません。
        </div>
      )}

      {/* Scoped styles */}
      <style>{`
        .binfo-select-wrap {
          position: relative; display: inline-flex; flex-shrink: 0;
        }
        .binfo-fy-select {
          appearance: none; -webkit-appearance: none;
          width: auto; height: 34px;
          padding: 6px 28px 6px 12px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          background: var(--color-bg) url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center;
          font-size: 13px; font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
          cursor: pointer;
          transition: border-color var(--transition-fast);
          font-family: inherit;
        }
        .binfo-fy-select:focus {
          outline: none;
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.08);
        }
        @media (max-width: 768px) {
          .binfo-fy-select { font-size: 12px; height: 32px; padding: 4px 26px 4px 10px; }
        }
      `}</style>
    </section>
  );
}
