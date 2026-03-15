import { Link } from "react-router-dom";

const APP_NAME = "MITO21 会員システム";

function StepCard({ number, title, children }) {
  return (
    <div className="guide-step">
      <div className="guide-step-header">
        <span className="guide-step-number">{number}</span>
        <h3 className="guide-step-title">{title}</h3>
      </div>
      <div className="guide-step-body">{children}</div>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="guide-tip">
      <span className="guide-tip-icon">&#128161;</span>
      <div>{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="guide-warning">
      <span className="guide-warning-icon">&#9888;&#65039;</span>
      <div>{children}</div>
    </div>
  );
}

export default function RegistrationGuide() {
  const origin = window.location.origin;

  return (
    <div className="guide-page">
      {/* Header */}
      <header className="guide-header">
        <div className="guide-header-inner">
          <Link to="/" className="guide-brand">
            <span className="guide-brand-mark">M</span>
            <div>
              <strong>MITO21</strong>
              <span>水戸21の会</span>
            </div>
          </Link>
          <Link to="/signin" className="btn btn-primary" style={{ fontSize: 13, padding: "8px 20px" }}>
            ログイン
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="guide-hero">
        <h1 className="guide-hero-title">{APP_NAME}<br />ご利用ガイド</h1>
        <p className="guide-hero-sub">
          新規登録からログインまでの手順をご案内します
        </p>
      </section>

      {/* Main content */}
      <main className="guide-main">
        {/* Table of contents */}
        <nav className="guide-toc">
          <h2 className="guide-toc-title">目次</h2>
          <ol className="guide-toc-list">
            <li><a href="#overview">はじめに</a></li>
            <li><a href="#register">新規アカウント登録</a></li>
            <li><a href="#verify">メール認証</a></li>
            <li><a href="#login">ログイン</a></li>
            <li><a href="#reset">パスワードを忘れた場合</a></li>
            <li><a href="#faq">よくある質問</a></li>
          </ol>
        </nav>

        {/* Section: Overview */}
        <section id="overview" className="guide-section">
          <h2 className="guide-section-title">はじめに</h2>
          <p className="guide-text">
            {APP_NAME}は、水戸21の会の会員専用Webシステムです。
            会員名簿の閲覧、会議情報の確認、会費状況の確認など、会の活動に必要な情報にアクセスできます。
          </p>
          <div className="guide-prereq">
            <h4 className="guide-prereq-title">ご利用の前に</h4>
            <ul className="guide-prereq-list">
              <li>管理者が事前に会員情報を登録している必要があります</li>
              <li>会員情報に登録されているメールアドレスでのみアカウント作成が可能です</li>
              <li>ご不明な場合は管理者（事務局）にお問い合わせください</li>
            </ul>
          </div>
        </section>

        {/* Section: Register */}
        <section id="register" className="guide-section">
          <h2 className="guide-section-title">STEP 1: 新規アカウント登録</h2>

          <StepCard number="1-1" title="ログイン画面を開く">
            <p>
              以下のURLにアクセスし、ログイン画面を表示します。
            </p>
            <div className="guide-url-box">
              <code>{origin}/signin</code>
            </div>
          </StepCard>

          <StepCard number="1-2" title="「新規登録はこちら」をクリック">
            <p>
              ログイン画面下部にある「<strong>新規登録はこちら</strong>」リンクをクリックして、
              新規登録フォームに切り替えます。
            </p>
          </StepCard>

          <StepCard number="1-3" title="情報を入力して登録">
            <p>以下の情報を入力してください：</p>
            <ul className="guide-list">
              <li><strong>メールアドレス</strong> ─ 会員情報に登録されているメールアドレス</li>
              <li><strong>パスワード</strong> ─ 8文字以上の任意のパスワード</li>
              <li><strong>パスワード（確認）</strong> ─ 同じパスワードをもう一度入力</li>
            </ul>
            <p>入力が完了したら「<strong>登録</strong>」ボタンを押します。</p>
            <Warning>
              会員情報に登録されていないメールアドレスでは登録できません。
              エラーが出る場合は、管理者にメールアドレスの確認をお願いしてください。
            </Warning>
          </StepCard>
        </section>

        {/* Section: Verify */}
        <section id="verify" className="guide-section">
          <h2 className="guide-section-title">STEP 2: メール認証</h2>

          <StepCard number="2-1" title="認証コードを確認">
            <p>
              登録したメールアドレスに<strong>6桁の認証コード</strong>が送信されます。
              メールを確認してください。
            </p>
            <Tip>
              メールが届かない場合は、迷惑メールフォルダもご確認ください。
            </Tip>
          </StepCard>

          <StepCard number="2-2" title="認証コードを入力">
            <p>
              画面に表示された入力欄に6桁の認証コードを入力し、
              「<strong>認証</strong>」ボタンを押します。
            </p>
            <Warning>
              認証コードの有効期限は<strong>10分</strong>です。
              期限切れの場合は、もう一度新規登録からやり直してください。
            </Warning>
          </StepCard>

          <StepCard number="2-3" title="認証完了">
            <p>
              「認証が完了しました」と表示されたら、アカウント登録は完了です。
              「<strong>ログインに戻る</strong>」をクリックしてログインに進みます。
            </p>
          </StepCard>
        </section>

        {/* Section: Login */}
        <section id="login" className="guide-section">
          <h2 className="guide-section-title">STEP 3: ログイン</h2>

          <StepCard number="3-1" title="ログイン情報を入力">
            <p>
              登録したメールアドレスとパスワードを入力し、
              「<strong>ログイン</strong>」ボタンを押します。
            </p>
          </StepCard>

          <StepCard number="3-2" title="ログイン完了">
            <p>
              ログインに成功すると、会員ポータル画面（マイページ）に移動します。
              左側のメニューから各機能にアクセスできます。
            </p>
            <Tip>
              スマートフォンからもご利用いただけます。
              ブラウザのブックマーク・ホーム画面への追加をおすすめします。
            </Tip>
          </StepCard>
        </section>

        {/* Section: Reset */}
        <section id="reset" className="guide-section">
          <h2 className="guide-section-title">パスワードを忘れた場合</h2>

          <StepCard number="1" title="パスワードリセット">
            <ol className="guide-numbered-list">
              <li>ログイン画面で「<strong>パスワードを忘れた方</strong>」をクリック</li>
              <li>登録済みのメールアドレスを入力して「<strong>リセットメールを送信</strong>」をクリック</li>
              <li>届いたメールに記載されたリンクから新しいパスワードを設定</li>
              <li>新しいパスワードでログインしてください</li>
            </ol>
          </StepCard>
        </section>

        {/* Section: FAQ */}
        <section id="faq" className="guide-section">
          <h2 className="guide-section-title">よくある質問</h2>

          <div className="guide-faq">
            <details className="guide-faq-item">
              <summary>登録しようとすると「登録に失敗しました」と表示されます</summary>
              <p>
                会員情報に登録されているメールアドレスのみ利用可能です。
                管理者（事務局）にメールアドレスが正しく登録されているかご確認ください。
              </p>
            </details>

            <details className="guide-faq-item">
              <summary>認証コードが届きません</summary>
              <p>
                迷惑メールフォルダをご確認ください。
                それでも届かない場合は、メールアドレスが正しいか確認の上、
                新規登録からやり直してください。
              </p>
            </details>

            <details className="guide-faq-item">
              <summary>「既にアカウント登録済みです」と表示されます</summary>
              <p>
                以前にアカウントを作成済みです。ログイン画面からメールアドレスとパスワードでログインしてください。
                パスワードを忘れた場合は「パスワードを忘れた方」からリセットできます。
              </p>
            </details>

            <details className="guide-faq-item">
              <summary>ログイン後に「アクセス権限がありません」と表示されます</summary>
              <p>
                会員情報とアカウントの紐付けがうまくいっていない可能性があります。
                管理者（事務局）にお問い合わせください。
              </p>
            </details>

            <details className="guide-faq-item">
              <summary>スマートフォンから使えますか？</summary>
              <p>
                はい、スマートフォンのブラウザ（Safari, Chrome等）からご利用いただけます。
                ホーム画面にブックマークを追加すると便利です。
              </p>
            </details>
          </div>
        </section>

        {/* CTA */}
        <section className="guide-cta">
          <h3 className="guide-cta-title">準備はできましたか？</h3>
          <p className="guide-cta-text">
            さっそくアカウントを作成して、会員システムをご利用ください。
          </p>
          <div className="guide-cta-buttons">
            <Link to="/signin" className="btn btn-primary" style={{ fontSize: 15, padding: "12px 32px" }}>
              ログイン・新規登録へ
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="guide-footer">
        <p>&copy; 水戸21の会 ─ {APP_NAME}</p>
      </footer>

      <style>{`
        /* ===== Guide Page Styles ===== */
        .guide-page {
          min-height: 100vh;
          background: var(--bg, #f8fafc);
          color: var(--text, #1e293b);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* Header */
        .guide-header {
          background: var(--panel, #fff);
          border-bottom: 1px solid var(--line, #e2e8f0);
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .guide-header-inner {
          max-width: 800px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .guide-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text, #1e293b);
        }
        .guide-brand strong {
          font-size: 16px;
          display: block;
          line-height: 1.2;
        }
        .guide-brand span {
          font-size: 11px;
          color: var(--text-secondary, #64748b);
        }
        .guide-brand-mark {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--primary, #4f46e5), #6366f1);
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* Hero */
        .guide-hero {
          background: linear-gradient(135deg, var(--primary, #4f46e5) 0%, #6366f1 100%);
          color: #fff;
          text-align: center;
          padding: 56px 24px 48px;
        }
        .guide-hero-title {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 12px;
          line-height: 1.4;
        }
        .guide-hero-sub {
          font-size: 15px;
          opacity: 0.9;
          margin: 0;
        }

        /* Main */
        .guide-main {
          max-width: 800px;
          margin: 0 auto;
          padding: 32px 24px 48px;
        }

        /* TOC */
        .guide-toc {
          background: var(--panel, #fff);
          border: 1px solid var(--line, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          padding: 24px 28px;
          margin-bottom: 36px;
        }
        .guide-toc-title {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 14px;
          color: var(--text, #1e293b);
        }
        .guide-toc-list {
          margin: 0;
          padding-left: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .guide-toc-list a {
          color: var(--primary, #4f46e5);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .guide-toc-list a:hover {
          text-decoration: underline;
        }

        /* Section */
        .guide-section {
          margin-bottom: 40px;
        }
        .guide-section-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text, #1e293b);
          margin: 0 0 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--primary, #4f46e5);
        }
        .guide-text {
          font-size: 14px;
          line-height: 1.8;
          color: var(--text, #1e293b);
          margin: 0 0 16px;
        }

        /* Prereq */
        .guide-prereq {
          background: var(--primary-light, #eef2ff);
          border: 1px solid var(--primary-100, #e0e7ff);
          border-radius: var(--radius, 8px);
          padding: 20px 24px;
        }
        .guide-prereq-title {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 10px;
          color: var(--primary, #4f46e5);
        }
        .guide-prereq-list {
          margin: 0;
          padding-left: 20px;
          font-size: 13px;
          line-height: 1.8;
          color: var(--text, #1e293b);
        }

        /* Step Card */
        .guide-step {
          background: var(--panel, #fff);
          border: 1px solid var(--line, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          margin-bottom: 16px;
          overflow: hidden;
        }
        .guide-step-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: var(--line-light, #f1f5f9);
          border-bottom: 1px solid var(--line, #e2e8f0);
        }
        .guide-step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--primary, #4f46e5);
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .guide-step-title {
          font-size: 15px;
          font-weight: 700;
          margin: 0;
          color: var(--text, #1e293b);
        }
        .guide-step-body {
          padding: 20px;
        }
        .guide-step-body p {
          font-size: 14px;
          line-height: 1.7;
          margin: 0 0 12px;
        }
        .guide-step-body p:last-child {
          margin-bottom: 0;
        }

        /* URL Box */
        .guide-url-box {
          background: var(--line-light, #f1f5f9);
          border: 1px solid var(--line, #e2e8f0);
          border-radius: var(--radius, 8px);
          padding: 12px 16px;
          margin-top: 8px;
          overflow-x: auto;
        }
        .guide-url-box code {
          font-size: 13px;
          color: var(--primary, #4f46e5);
          font-weight: 600;
          word-break: break-all;
        }

        /* Lists */
        .guide-list {
          margin: 8px 0;
          padding-left: 20px;
          font-size: 14px;
          line-height: 1.8;
        }
        .guide-numbered-list {
          margin: 8px 0 0;
          padding-left: 20px;
          font-size: 14px;
          line-height: 2;
        }

        /* Tip / Warning */
        .guide-tip, .guide-warning {
          display: flex;
          gap: 10px;
          border-radius: var(--radius, 8px);
          padding: 12px 16px;
          margin-top: 12px;
          font-size: 13px;
          line-height: 1.6;
        }
        .guide-tip {
          background: var(--info-light, #eff6ff);
          border: 1px solid #bfdbfe;
          color: var(--info, #2563eb);
        }
        .guide-warning {
          background: var(--warning-light, #fffbeb);
          border: 1px solid #fde68a;
          color: #92400e;
        }
        .guide-tip-icon, .guide-warning-icon {
          flex-shrink: 0;
          font-size: 16px;
          line-height: 1.4;
        }

        /* FAQ */
        .guide-faq {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .guide-faq-item {
          background: var(--panel, #fff);
          border: 1px solid var(--line, #e2e8f0);
          border-radius: var(--radius, 8px);
          overflow: hidden;
        }
        .guide-faq-item summary {
          padding: 14px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          list-style: none;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .guide-faq-item summary::before {
          content: "Q.";
          color: var(--primary, #4f46e5);
          font-weight: 700;
          flex-shrink: 0;
        }
        .guide-faq-item summary::-webkit-details-marker {
          display: none;
        }
        .guide-faq-item[open] summary {
          border-bottom: 1px solid var(--line, #e2e8f0);
          background: var(--line-light, #f1f5f9);
        }
        .guide-faq-item p {
          padding: 16px 20px;
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: var(--text, #1e293b);
        }

        /* CTA */
        .guide-cta {
          text-align: center;
          background: var(--panel, #fff);
          border: 1px solid var(--line, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          padding: 40px 24px;
          margin-top: 40px;
        }
        .guide-cta-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .guide-cta-text {
          font-size: 14px;
          color: var(--text-secondary, #64748b);
          margin: 0 0 24px;
        }
        .guide-cta-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Footer */
        .guide-footer {
          text-align: center;
          padding: 24px;
          font-size: 12px;
          color: var(--muted, #94a3b8);
          border-top: 1px solid var(--line, #e2e8f0);
        }
        .guide-footer p {
          margin: 0;
        }

        /* Mobile */
        @media (max-width: 640px) {
          .guide-hero {
            padding: 40px 16px 32px;
          }
          .guide-hero-title {
            font-size: 22px;
          }
          .guide-main {
            padding: 24px 16px 40px;
          }
          .guide-toc {
            padding: 20px;
          }
          .guide-step-header {
            padding: 12px 16px;
          }
          .guide-step-body {
            padding: 16px;
          }
          .guide-cta {
            padding: 32px 16px;
          }
          .guide-header-inner {
            padding: 12px 16px;
          }
        }
      `}</style>
    </div>
  );
}
