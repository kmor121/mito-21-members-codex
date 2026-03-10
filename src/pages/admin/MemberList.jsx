import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

const MEMBER_TYPES = ["正会員", "賛助会員", "OB会員", "名誉顧問"];
const STATUSES = ["活動中", "休会", "退会"];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
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

  // Inline editing
  const [editMode, setEditMode] = useState(false);
  const [editingRows, setEditingRows] = useState({});
  const saveTimerRef = useRef({});

  // Debounced search query
  const debouncedQ = useDebounce(q, 300);

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
      if (filters.is_new) params.set("is_new", "true");

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

  function getCurrentFilters() {
    return {
      q: q.trim(),
      status,
      member_type: memberType === "新入会員" ? "" : memberType,
      approval_status: approvalStatus,
      organization_id: organizationId,
      is_new: memberType === "新入会員" ? true : undefined,
    };
  }

  // Initial load
  useEffect(() => {
    loadMembers({});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time search on debounced query change
  useEffect(() => {
    loadMembers(getCurrentFilters());
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-search when filter dropdowns change
  useEffect(() => {
    loadMembers(getCurrentFilters());
  }, [status, memberType, approvalStatus, organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleReset() {
    setQ("");
    setStatus("");
    setMemberType("");
    setApprovalStatus("");
    setOrganizationId("");
    loadMembers({});
  }

  // Inline editing helpers
  function handleCellChange(memberId, field, value) {
    setEditingRows((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || {}), [field]: value },
    }));

    // Debounced auto-save (1 second)
    if (saveTimerRef.current[memberId]) {
      clearTimeout(saveTimerRef.current[memberId]);
    }
    saveTimerRef.current[memberId] = setTimeout(() => {
      saveRow(memberId);
    }, 1000);
  }

  async function saveRow(memberId) {
    const changes = editingRows[memberId];
    if (!changes || Object.keys(changes).length === 0) return;

    try {
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memberId,
          allow_partial_profile_update: true,
          changed_by: "管理者",
          changed_by_role: "admin",
          ...changes,
        }),
      });

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, ...changes } : m))
      );
      setEditingRows((prev) => {
        const next = { ...prev };
        delete next[memberId];
        return next;
      });
    } catch (err) {
      setError(`保存に失敗: ${err.message}`);
    }
  }

  function getCellValue(member, field) {
    if (editingRows[member.id] && field in editingRows[member.id]) {
      return editingRows[member.id][field];
    }
    return member[field] || "";
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">会員一覧</h1>
        <p className="page-description">全会員の検索・管理</p>
      </div>

      <section className="card panel-card single-panel">
        <div className="card-body stack">
          <div className="filter-grid">
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
                <option value="名誉顧問">名誉顧問</option>
                <option value="新入会員">新入会員</option>
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
              <label htmlFor="ml-org">所属</label>
              <select id="ml-org" name="organization_id" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
                <option value="">すべて</option>
                {orgOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-actions">
              <button className="button ghost" type="button" onClick={handleReset}>リセット</button>
              <button
                className={`button${editMode ? "" : " ghost"}`}
                type="button"
                onClick={() => setEditMode((v) => !v)}
              >
                {editMode ? "編集モード ON" : "編集モード"}
              </button>
            </div>
          </div>

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
                    <th>所属・役職</th>
                    <th>会員種別</th>
                    <th>ステータス</th>
                    <th>メール</th>
                    <th>携帯</th>
                    <th>詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => {
                    const assigns = Array.isArray(m.org_assignments) ? m.org_assignments : [];
                    const orgText = assigns
                      .map((a) => `${a.org_name || ""}${a.role ? "/" + a.role : ""}`)
                      .join(", ");

                    return (
                      <tr
                        key={m.id}
                        style={{ cursor: editMode ? "default" : "pointer" }}
                        onClick={editMode ? undefined : () => navigate(`/admin/members/${m.id}`)}
                      >
                        <td>{displayValue(m.member_number)}</td>
                        <td>
                          {displayValue(m.name_kanji)}
                          {m.is_new && <span className="pill pill-info" style={{ marginLeft: 4, fontSize: '0.75em' }}>新入</span>}
                          {m.is_graduate && <span className="pill pill-warning" style={{ marginLeft: 4, fontSize: '0.75em' }}>卒業生</span>}
                        </td>
                        {editMode ? (
                          <>
                            <td>
                              <input
                                type="text"
                                className="inline-edit-input"
                                value={getCellValue(m, "company_name")}
                                onChange={(e) => handleCellChange(m.id, "company_name", e.target.value)}
                              />
                            </td>
                            <td>{orgText || "-"}</td>
                            <td>
                              <select
                                className="inline-edit-input"
                                value={getCellValue(m, "member_type")}
                                onChange={(e) => handleCellChange(m.id, "member_type", e.target.value)}
                              >
                                {MEMBER_TYPES.map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <select
                                className="inline-edit-input"
                                value={getCellValue(m, "status")}
                                onChange={(e) => handleCellChange(m.id, "status", e.target.value)}
                              >
                                {STATUSES.map((s) => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="email"
                                className="inline-edit-input"
                                value={getCellValue(m, "email")}
                                onChange={(e) => handleCellChange(m.id, "email", e.target.value)}
                              />
                            </td>
                            <td>
                              <input
                                type="tel"
                                className="inline-edit-input"
                                value={getCellValue(m, "mobile_phone")}
                                onChange={(e) => handleCellChange(m.id, "mobile_phone", e.target.value)}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td>{displayValue(m.company_name)}</td>
                            <td>{orgText || "-"}</td>
                            <td><span className="pill">{displayValue(m.member_type)}</span></td>
                            <td><span className="pill">{displayValue(m.status)}</span></td>
                            <td>{displayValue(m.email)}</td>
                            <td>{displayValue(m.mobile_phone)}</td>
                          </>
                        )}
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
