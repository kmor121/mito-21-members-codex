import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <section className="landing-page">
      <div className="landing-hero">
        <h1 className="landing-title">水戸21の会</h1>
        <p className="landing-subtitle">会員管理システム</p>
      </div>
      <div className="landing-cards">
        <Link className="landing-card" to="/apply">
          <div className="landing-card-icon" aria-hidden="true">&#128203;</div>
          <h2>入会申込</h2>
          <p>新規入会をご希望の方はこちらから申込できます</p>
        </Link>
        <Link className="landing-card" to="/directory">
          <div className="landing-card-icon" aria-hidden="true">&#128101;</div>
          <h2>会員ページ</h2>
          <p>会員名簿・基本情報・組織図・マニュアルを閲覧</p>
        </Link>
        <Link className="landing-card" to="/admin/dashboard">
          <div className="landing-card-icon" aria-hidden="true">&#9881;</div>
          <h2>管理画面</h2>
          <p>管理者向けのダッシュボードと各種管理機能</p>
        </Link>
      </div>
      <div style={{ marginTop: 40, fontSize: 14, color: '#64748b' }}>
        <a href="https://mito21.net/" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>
          水戸21の会 公式サイト
        </a>
      </div>
    </section>
  );
}
