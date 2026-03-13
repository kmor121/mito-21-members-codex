import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const { login, canAccessAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const returnTo = location.state?.returnTo;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      // After login, canAccessAdmin may not be updated yet in this render,
      // so we navigate and let the router redirect logic handle it
      if (returnTo) {
        navigate(returnTo, { replace: true });
      } else {
        // Will be handled by the root redirect
        navigate("/", { replace: true });
      }
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("Invalid") || msg.includes("credentials") || msg.includes("password")) {
        setError("メールアドレスまたはパスワードが正しくありません");
      } else if (msg.includes("not found") || msg.includes("user")) {
        setError("このメールアドレスは登録されていません");
      } else {
        setError("ログインに失敗しました。もう一度お試しください。");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #f0f4ff 0%, #e8ecf4 100%)",
      padding: 16,
    }}>
      <div style={{
        width: "100%", maxWidth: 400, background: "#fff",
        borderRadius: 12, boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        padding: "40px 32px",
      }}>
        {/* Brand */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #4f46e5, #6366f1)",
            color: "#fff", fontSize: 22, fontWeight: 700,
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12,
          }}>M</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1e293b", margin: "0 0 4px" }}>
            MITO21
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            水戸21の会 会員システム
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 20,
            background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
            fontSize: 13, lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="example@email.com"
              style={{
                width: "100%", padding: "10px 12px", fontSize: 14,
                border: "1px solid #d1d5db", borderRadius: 8,
                outline: "none", transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#6366f1"; }}
              onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="パスワードを入力"
              style={{
                width: "100%", padding: "10px 12px", fontSize: 14,
                border: "1px solid #d1d5db", borderRadius: 8,
                outline: "none", transition: "border-color 0.2s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#6366f1"; }}
              onBlur={(e) => { e.target.style.borderColor = "#d1d5db"; }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%", padding: "11px 0", fontSize: 15, fontWeight: 600,
              color: "#fff", background: submitting ? "#a5b4fc" : "#4f46e5",
              border: "none", borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { if (!submitting) e.target.style.background = "#4338ca"; }}
            onMouseLeave={(e) => { if (!submitting) e.target.style.background = "#4f46e5"; }}
          >
            {submitting ? "ログイン中..." : "ログイン"}
          </button>
        </form>

        {/* Footer links */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => {/* TODO: password reset */}}
            style={{
              background: "none", border: "none", color: "#6366f1",
              fontSize: 13, cursor: "pointer", textDecoration: "underline",
            }}
          >
            パスワードを忘れた方
          </button>
        </div>
      </div>
    </div>
  );
}
