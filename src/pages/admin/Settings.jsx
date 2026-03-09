import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../../api/base44Client';
import LoadingSpinner from '../../components/common/LoadingSpinner';

function displayValue(v) {
  if (v === null || v === undefined || v === "") return "-";
  if (typeof v === "boolean") return v ? "はい" : "いいえ";
  return String(v);
}

export default function Settings() {
  const [admins, setAdmins] = useState([]);
  const [nonAdmins, setNonAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const loadSettings = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const result = await apiRequest("list-admin-members");
      const raw = result.members || result;
      const members = Array.isArray(raw) ? raw : [];
      const adminList = members.filter((m) => m.role === "admin");
      const nonAdminList = members.filter((m) => m.role !== "admin");
      setAdmins(adminList);
      setNonAdmins(nonAdminList);
    } catch (err) {
      setError(err.message || "設定の取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggleRole(memberId, role) {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      await apiRequest("toggle-member-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, role }),
      });
      setMessage("権限を変更しました。");
      setSelectedMemberId("");
      await loadSettings();
    } catch (err) {
      setError(err.message || "権限変更に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  function handleGrantAdmin(e) {
    e.preventDefault();
    if (!selectedMemberId) return;
    handleToggleRole(selectedMemberId, "admin");
  }

  if (loading) {
    return (
      <section className="admin-shell">
        <div className="page-header">
          <h1 className="page-title">設定</h1>
          <p className="page-description">管理者設定</p>
        </div>
        <section className="card panel-card single-panel">
          <div className="card-body">
            <LoadingSpinner />
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="admin-shell">
      <div className="page-header">
        <h1 className="page-title">設定</h1>
        <p className="page-description">管理者設定</p>
      </div>

      {(error || message) && (
        <p className={`message${error ? " error" : ""}`} aria-live="polite">
          {error || message}
        </p>
      )}

      <div className="settings-grid">
        {/* Admin links card */}
        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>管理画面へのリンク</h2></div>
            </div>
            <div className="dashboard-metrics">
              <Link className="metric-card" to="/admin/fiscal-years">年度管理</Link>
              <Link className="metric-card" to="/admin/dues-management">会費管理</Link>
              <Link className="metric-card" to="/admin/documents">資料管理</Link>
              <Link className="metric-card" to="/admin/newsletters">配信管理</Link>
              <Link className="metric-card" to="/admin/applications">申込管理</Link>
              <Link className="metric-card" to="/admin/organization-chart">組織図管理</Link>
            </div>
          </div>
        </section>

        {/* Email settings card */}
        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>メール配信設定</h2></div>
            </div>
            <div className="info-block">
              <p><span className="muted">配信エンジン:</span> Resend API</p>
              <p><span className="muted">送信元:</span> env</p>
              <p><span className="muted">APIキー:</span> env</p>
              <p>
                <span className="muted">ステータス:</span>{" "}
                <span className="pill pill-success">設定済み</span>
              </p>
            </div>
          </div>
        </section>

        {/* LINE settings card */}
        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>LINE連携設定</h2></div>
            </div>
            <p>
              <span className="pill pill-warning">準備中</span>
            </p>
            <p className="muted">LINE連携機能は現在準備中です。今後のアップデートで対応予定です。</p>
          </div>
        </section>

        {/* Admin accounts card */}
        <section className="card detail-card stack-sm">
          <div className="card-body stack">
            <div className="panel-heading">
              <div><h2>管理者アカウント</h2></div>
            </div>

            {admins.length === 0 ? (
              <p className="empty-state">管理者がいません。</p>
            ) : (
              <div className="pending-list">
                {admins.map((a) => (
                  <div key={a.id} className="basic-info-document">
                    <div>
                      <strong>{displayValue(a.name_kanji || a.name)}</strong>
                      <span className="muted" style={{ marginLeft: "0.5rem" }}>
                        {displayValue(a.email)}
                      </span>
                      <span className="muted" style={{ marginLeft: "0.5rem" }}>
                        No.{displayValue(a.member_number)}
                      </span>
                    </div>
                    <div>
                      <button
                        className="button ghost"
                        type="button"
                        disabled={saving}
                        onClick={() => handleToggleRole(a.id, "member")}
                      >
                        権限剥奪
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <form className="filter-actions" onSubmit={handleGrantAdmin} style={{ marginTop: "1rem" }}>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
              >
                <option value="">会員を選択...</option>
                {nonAdmins.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name_kanji || m.name || m.email} (No.{m.member_number || "-"})
                  </option>
                ))}
              </select>
              <button className="button" type="submit" disabled={saving || !selectedMemberId}>
                管理者権限を付与
              </button>
            </form>
          </div>
        </section>
      </div>
    </section>
  );
}
