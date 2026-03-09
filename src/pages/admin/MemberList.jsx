import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

export default function MemberList() {
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [orgOptions, setOrgOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Filter state
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [memberType, setMemberType] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [organizationId, setOrganizationId] = useState("");

  const loadMembers = useCallback(async (filters) => {
    setError("");
    setMessage("読み込み中...");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.status) params.set("status", filters.status);
      if (filters.member_type) params.set("member_type", filters.member_type);
      if (filters.approval_status) params.set("approval_status", filters.approval_status);
      if (filters.organization_id) params.set("organization_id", filters.organization_id);

      const qs = params.toString();
      const path = qs ? `list-members-admin?${qs}` : "list-members-admin";
      const result = await apiRequest(path);
      const rawList = result.members;
      const list = Array.isArray(rawList) ? rawList : [];
      const rawOpts = result.org_options;
      const opts = Array.isArray(rawOpts) ? rawOpts : [];

      if (opts.length > 0) {
        setOrgOptions(opts);
      }

      setMembers(list);
      setMessage(`${list.length}件の会員を表示中`);
    } catch (err) {
      setMembers([]);
      setError(err.message || "会員一覧の取得に失敗しました。");
      setMessage("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers({});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e) {
    e.preventDefault();
    loadMembers({
      q: q.trim(),
      status,
      member_type: memberType,
      approval_status: approvalStatus,
      organization_id: organizationId,
    });
  }

  function handleReset() {
    setQ("");
    setStatus("");
    setMemberType("");
    setApprovalStatus("");
    setOrganizationId("");
    loadMembers({});
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">会員一覧</h1>
        <p className="page-description">全会員の検索・管理</p>
      </div>

      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <form className="filter-grid" noValidate onSubmit={handleSubmit}>
            <div className="field field-span-2">
              <label htmlFor="ml-search">検索</label>
              <input
                id="ml-search"
                name="q"
                type="text"
                placeholder="氏名 / フリガナ / 会社名 / メール"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="ml-status">ステータス</label>
              <select id="ml-status" name="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">すべて</option>
                <option value="活動中">活動中</option>
                <option value="休会">休会</option>
                <option value="退会">退会</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ml-member-type">会員種別</label>
              <select id="ml-member-type" name="member_type" value={memberType} onChange={(e) => setMemberType(e.target.value)}>
                <option value="">すべて</option>
                <option value="正会員">正会員</option>
                <option value="賛助会員">賛助会員</option>
                <option value="OB会員">OB会員</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ml-approval-status">承認状態</label>
              <select id="ml-approval-status" name="approval_status" value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)}>
                <option value="">すべて</option>
                <option value="承認済">承認済</option>
                <option value="申請中">申請中</option>
                <option value="却下">却下</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ml-org">委員会</label>
              <select id="ml-org" name="organization_id" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                <option value="">すべて</option>
                {orgOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-actions">
              <button className="button" type="submit">検索する</button>
              <button className="button ghost" type="button" onClick={handleReset}>リセット</button>
            </div>
          </form>

          <div className="panel-heading compact">
            <p className={`message${error ? " error" : ""}`} aria-live="polite">
              {error || message}
            </p>
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : members.length === 0 && !error ? (
            <p className="empty-state">該当する会員はいません。</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>番号</th>
                    <th>氏名</th>
                    <th>会社名</th>
                    <th>委員会・役職</th>
                    <th>会員種別</th>
                    <th>ステータス</th>
                    <th>メール</th>
                    <th>詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const assigns = m.org_assignments || [];
                    const orgText = assigns
                      .map((a) => `${a.org_name || ""}${a.role ? "/" + a.role : ""}`)
                      .join(", ");

                    return (
                      <tr
                        key={m.id}
                        style={{ cursor: "pointer" }}
                        onClick={() => navigate(`/admin/members/${m.id}`)}
                      >
                        <td>{displayValue(m.member_number)}</td>
                        <td>{displayValue(m.name_kanji)}</td>
                        <td>{displayValue(m.company_name)}</td>
                        <td>{orgText || "-"}</td>
                        <td><span className="pill">{displayValue(m.member_type)}</span></td>
                        <td><span className="pill">{displayValue(m.status)}</span></td>
                        <td>{displayValue(m.email)}</td>
                        <td>
                          <button
                            className="text-link"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/members/${m.id}`);
                            }}
                          >
                            詳細
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
