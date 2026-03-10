import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "はい" : "いいえ";
  return String(value);
}

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

function BasicInfoSection({ section, isActive }) {
  const documents = section.documents || [];

  return (
    <section
      className={`detail-card stack basic-info-panel${isActive ? " is-active" : ""}`}
      data-info-panel={section.key}
      hidden={!isActive}
    >
      <div className="panel-heading">
        <div>
          <h2>{section.label}</h2>
        </div>
      </div>
      {documents.length
        ? documents.map((doc, idx) => <BasicInfoDocument key={idx} doc={doc} />)
        : <p className="empty-state">{section.label}はまだ公開されていません。</p>
      }
    </section>
  );
}

export default function BasicInfo() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fiscalYearIdParam = searchParams.get("fiscalYearId") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [years, setYears] = useState([]);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState(null);
  const [sections, setSections] = useState([]);
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    (async () => {
      try {
        const fyResponse = await apiRequest("list-fiscal-years");
        const fyData = fyResponse || {};
        const currentFyId = fyData.current_fiscal_year_id || "";
        const effectiveId = fiscalYearIdParam || currentFyId;
        const query = effectiveId
          ? `get-member-basic-info?fiscalYearId=${encodeURIComponent(effectiveId)}`
          : "get-member-basic-info";
        const result = await apiRequest(query);

        const rawYears = fyData.years || fyData.fiscal_years || result.fiscal_years;
        const yearsList = Array.isArray(rawYears) ? rawYears : [];
        const rawSections = result.sections;
        const sectionsList = Array.isArray(rawSections) ? rawSections : [];

        setYears(yearsList);
        setSelectedFiscalYear(result.selected_fiscal_year || null);
        setSections(sectionsList);
        setActiveTab(sectionsList[0]?.key || "business_plan");
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

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">基本情報</h1>
          <p className="page-description">年度ごとの事業計画・理念・会則・年間スケジュール</p>
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
          <h1 className="page-title">基本情報</h1>
          <p className="page-description">年度ごとの事業計画・理念・会則・年間スケジュール</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body stack">
            <p className="message error">{error}</p>
            <div className="actions">
              <Link className="text-link" to="/directory">会員名簿へ</Link>
              <Link className="text-link" to="/mypage">マイページへ</Link>
            </div>
          </div>
        </section>
      </section>
    );
  }

  const selectedFiscalYearId = selectedFiscalYear?.id || "";

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">基本情報</h1>
        <p className="page-description">年度ごとの事業計画・理念・会則・年間スケジュール</p>
      </div>
      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="panel-heading">
            <div>
              <h2>
                {selectedFiscalYear
                  ? `${formatFiscalYearLabel(selectedFiscalYear)}の基本情報`
                  : "基本情報"}
              </h2>
            </div>
          </div>

          <form className="basic-info-filter" noValidate>
            <div className="field">
              <label htmlFor="basic-info-fiscal-year">年度</label>
              <select
                id="basic-info-fiscal-year"
                name="fiscal_year_id"
                value={selectedFiscalYearId}
                onChange={handleFiscalYearChange}
              >
                {years.length ? (
                  years.map((fy) => (
                    <option key={fy.id} value={fy.id}>
                      {formatFiscalYearLabel(fy)}{fy.is_current ? "（現在年度）" : ""}
                    </option>
                  ))
                ) : (
                  <option value="">年度データ未登録</option>
                )}
              </select>
            </div>
          </form>

          {!years.length && (
            <p className="empty-state">
              年度が未登録のため、表示対象の年度を決められません。管理画面で年度を登録すると切替表示できます。
            </p>
          )}

          <div className="basic-info-tabs" role="tablist" aria-label="基本情報セクション">
            {sections.map((section) => (
              <button
                key={section.key}
                className={`basic-info-tab${section.key === activeTab ? " is-active" : ""}`}
                type="button"
                aria-pressed={section.key === activeTab ? "true" : "false"}
                onClick={() => handleTabClick(section.key)}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="stack">
            {sections.map((section) => (
              <BasicInfoSection
                key={section.key}
                section={section}
                isActive={section.key === activeTab}
              />
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
