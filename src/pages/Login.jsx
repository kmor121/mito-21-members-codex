import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { auth, FUNCTION_BASE } from "../api/base44Client";
import { useNavigate, useLocation } from "react-router-dom";

const inputStyle = {
  width: "100%", padding: "10px 12px", fontSize: 14,
  border: "1px solid #d1d5db", borderRadius: 8,
  outline: "none", transition: "border-color 0.2s",
  boxSizing: "border-box",
};

function focusBorder(e) { e.target.style.borderColor = "#6366f1"; }
function blurBorder(e) { e.target.style.borderColor = "#d1d5db"; }

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("login"); // "login" | "reset" | "resetSent" | "register" | "registerDone"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const returnTo = location.state?.returnTo;

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(returnTo || "/", { replace: true });
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

  async function handleResetRequest(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await auth.resetPasswordRequest(resetEmail);
      setMode("resetSent");
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("not found") || msg.includes("user")) {
        setError("このメールアドレスは登録されていません");
      } else {
        setError("送信に失敗しました。もう一度お試しください。");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    if (regPassword.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      setError("パスワードが一致しません");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${FUNCTION_BASE}/register-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: regEmail, password: regPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "登録に失敗しました");
      }
      setEmail(regEmail); // pre-fill login form
      setMode("registerDone");
    } catch (err) {
      setError(err.message || "登録に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  function switchToReset() {
    setMode("reset");
    setResetEmail(email);
    setError("");
  }

  function switchToRegister() {
    setMode("register");
    setRegEmail(email);
    setError("");
  }

  function switchToLogin() {
    setMode("login");
    setError("");
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

        {/* ── Login form ── */}
        {mode === "login" && (
          <>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                  メールアドレス
                </label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  required autoComplete="email" placeholder="example@email.com"
                  style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                  パスワード
                </label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete="current-password" placeholder="パスワードを入力"
                  style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>
              <button
                type="submit" disabled={submitting}
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
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button type="button" onClick={switchToReset} style={{
                background: "none", border: "none", color: "#6366f1",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}>
                パスワードを忘れた方
              </button>
            </div>
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button type="button" onClick={switchToRegister} style={{
                background: "none", border: "none", color: "#6366f1",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}>
                新規登録はこちら
              </button>
            </div>
          </>
        )}

        {/* ── Register form ── */}
        {mode === "register" && (
          <>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 20, lineHeight: 1.6 }}>
              会員として登録済みのメールアドレスでアカウントを作成できます。
            </p>
            <form onSubmit={handleRegister}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                  メールアドレス
                </label>
                <input
                  type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                  required autoComplete="email" placeholder="example@email.com"
                  style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                  パスワード（8文字以上）
                </label>
                <input
                  type="password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)}
                  required autoComplete="new-password" placeholder="8文字以上のパスワード"
                  minLength={8}
                  style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                  パスワード（確認）
                </label>
                <input
                  type="password" value={regPasswordConfirm} onChange={(e) => setRegPasswordConfirm(e.target.value)}
                  required autoComplete="new-password" placeholder="もう一度入力してください"
                  minLength={8}
                  style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>
              <button
                type="submit" disabled={submitting}
                style={{
                  width: "100%", padding: "11px 0", fontSize: 15, fontWeight: 600,
                  color: "#fff", background: submitting ? "#a5b4fc" : "#4f46e5",
                  border: "none", borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { if (!submitting) e.target.style.background = "#4338ca"; }}
                onMouseLeave={(e) => { if (!submitting) e.target.style.background = "#4f46e5"; }}
              >
                {submitting ? "登録中..." : "登録"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button type="button" onClick={switchToLogin} style={{
                background: "none", border: "none", color: "#6366f1",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}>
                ログインに戻る
              </button>
            </div>
          </>
        )}

        {/* ── Register done ── */}
        {mode === "registerDone" && (
          <>
            <div style={{
              padding: "14px 16px", borderRadius: 8, marginBottom: 20,
              background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d",
              fontSize: 13, lineHeight: 1.6,
            }}>
              登録が完了しました。ログインしてください。
            </div>
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={switchToLogin} style={{
                background: "none", border: "none", color: "#6366f1",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}>
                ログインに戻る
              </button>
            </div>
          </>
        )}

        {/* ── Password reset form ── */}
        {mode === "reset" && (
          <>
            <p style={{ fontSize: 14, color: "#374151", marginBottom: 20, lineHeight: 1.6 }}>
              登録済みのメールアドレスを入力してください。パスワードリセット用のメールをお送りします。
            </p>
            <form onSubmit={handleResetRequest}>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "#374151", marginBottom: 6 }}>
                  メールアドレス
                </label>
                <input
                  type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                  required autoComplete="email" placeholder="example@email.com"
                  style={inputStyle} onFocus={focusBorder} onBlur={blurBorder}
                />
              </div>
              <button
                type="submit" disabled={submitting}
                style={{
                  width: "100%", padding: "11px 0", fontSize: 15, fontWeight: 600,
                  color: "#fff", background: submitting ? "#a5b4fc" : "#4f46e5",
                  border: "none", borderRadius: 8, cursor: submitting ? "not-allowed" : "pointer",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => { if (!submitting) e.target.style.background = "#4338ca"; }}
                onMouseLeave={(e) => { if (!submitting) e.target.style.background = "#4f46e5"; }}
              >
                {submitting ? "送信中..." : "リセットメールを送信"}
              </button>
            </form>
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button type="button" onClick={switchToLogin} style={{
                background: "none", border: "none", color: "#6366f1",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}>
                ログインに戻る
              </button>
            </div>
          </>
        )}

        {/* ── Reset sent confirmation ── */}
        {mode === "resetSent" && (
          <>
            <div style={{
              padding: "14px 16px", borderRadius: 8, marginBottom: 20,
              background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#15803d",
              fontSize: 13, lineHeight: 1.6,
            }}>
              パスワードリセットメールを送信しました。メールを確認してください。
            </div>
            <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
              メールが届かない場合は、迷惑メールフォルダを確認するか、再度お試しください。
            </p>
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={switchToLogin} style={{
                background: "none", border: "none", color: "#6366f1",
                fontSize: 13, cursor: "pointer", textDecoration: "underline",
              }}>
                ログインに戻る
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
