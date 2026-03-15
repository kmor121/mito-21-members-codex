import{j as e,L as s}from"./index-B1PdaHZF.js";const n="MITO21 会員システム";function i({number:r,title:t,children:l}){return e.jsxs("div",{className:"guide-step",children:[e.jsxs("div",{className:"guide-step-header",children:[e.jsx("span",{className:"guide-step-number",children:r}),e.jsx("h3",{className:"guide-step-title",children:t})]}),e.jsx("div",{className:"guide-step-body",children:l})]})}function d({children:r}){return e.jsxs("div",{className:"guide-tip",children:[e.jsx("span",{className:"guide-tip-icon",children:"💡"}),e.jsx("div",{children:r})]})}function a({children:r}){return e.jsxs("div",{className:"guide-warning",children:[e.jsx("span",{className:"guide-warning-icon",children:"⚠️"}),e.jsx("div",{children:r})]})}function x(){const r=window.location.origin;return e.jsxs("div",{className:"guide-page",children:[e.jsx("header",{className:"guide-header",children:e.jsxs("div",{className:"guide-header-inner",children:[e.jsxs(s,{to:"/",className:"guide-brand",children:[e.jsx("span",{className:"guide-brand-mark",children:"M"}),e.jsxs("div",{children:[e.jsx("strong",{children:"MITO21"}),e.jsx("span",{children:"水戸21の会"})]})]}),e.jsx(s,{to:"/signin",className:"btn btn-primary",style:{fontSize:13,padding:"8px 20px"},children:"ログイン"})]})}),e.jsxs("section",{className:"guide-hero",children:[e.jsxs("h1",{className:"guide-hero-title",children:[n,e.jsx("br",{}),"ご利用ガイド"]}),e.jsx("p",{className:"guide-hero-sub",children:"新規登録からログインまでの手順をご案内します"})]}),e.jsxs("main",{className:"guide-main",children:[e.jsxs("nav",{className:"guide-toc",children:[e.jsx("h2",{className:"guide-toc-title",children:"目次"}),e.jsxs("ol",{className:"guide-toc-list",children:[e.jsx("li",{children:e.jsx("a",{href:"#overview",children:"はじめに"})}),e.jsx("li",{children:e.jsx("a",{href:"#register",children:"新規アカウント登録"})}),e.jsx("li",{children:e.jsx("a",{href:"#verify",children:"メール認証"})}),e.jsx("li",{children:e.jsx("a",{href:"#login",children:"ログイン"})}),e.jsx("li",{children:e.jsx("a",{href:"#reset",children:"パスワードを忘れた場合"})}),e.jsx("li",{children:e.jsx("a",{href:"#faq",children:"よくある質問"})})]})]}),e.jsxs("section",{id:"overview",className:"guide-section",children:[e.jsx("h2",{className:"guide-section-title",children:"はじめに"}),e.jsxs("p",{className:"guide-text",children:[n,"は、水戸21の会の会員専用Webシステムです。 会員名簿の閲覧、会議情報の確認、会費状況の確認など、会の活動に必要な情報にアクセスできます。"]}),e.jsxs("div",{className:"guide-prereq",children:[e.jsx("h4",{className:"guide-prereq-title",children:"ご利用の前に"}),e.jsxs("ul",{className:"guide-prereq-list",children:[e.jsx("li",{children:"管理者が事前に会員情報を登録している必要があります"}),e.jsx("li",{children:"会員情報に登録されているメールアドレスでのみアカウント作成が可能です"}),e.jsx("li",{children:"ご不明な場合は管理者（事務局）にお問い合わせください"})]})]})]}),e.jsxs("section",{id:"register",className:"guide-section",children:[e.jsx("h2",{className:"guide-section-title",children:"STEP 1: 新規アカウント登録"}),e.jsxs(i,{number:"1-1",title:"ログイン画面を開く",children:[e.jsx("p",{children:"以下のURLにアクセスし、ログイン画面を表示します。"}),e.jsx("div",{className:"guide-url-box",children:e.jsxs("code",{children:[r,"/signin"]})})]}),e.jsx(i,{number:"1-2",title:"「新規登録はこちら」をクリック",children:e.jsxs("p",{children:["ログイン画面下部にある「",e.jsx("strong",{children:"新規登録はこちら"}),"」リンクをクリックして、 新規登録フォームに切り替えます。"]})}),e.jsxs(i,{number:"1-3",title:"情報を入力して登録",children:[e.jsx("p",{children:"以下の情報を入力してください："}),e.jsxs("ul",{className:"guide-list",children:[e.jsxs("li",{children:[e.jsx("strong",{children:"メールアドレス"})," ─ 会員情報に登録されているメールアドレス"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"パスワード"})," ─ 8文字以上の任意のパスワード"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"パスワード（確認）"})," ─ 同じパスワードをもう一度入力"]})]}),e.jsxs("p",{children:["入力が完了したら「",e.jsx("strong",{children:"登録"}),"」ボタンを押します。"]}),e.jsx(a,{children:"会員情報に登録されていないメールアドレスでは登録できません。 エラーが出る場合は、管理者にメールアドレスの確認をお願いしてください。"})]})]}),e.jsxs("section",{id:"verify",className:"guide-section",children:[e.jsx("h2",{className:"guide-section-title",children:"STEP 2: メール認証"}),e.jsxs(i,{number:"2-1",title:"認証コードを確認",children:[e.jsxs("p",{children:["登録したメールアドレスに",e.jsx("strong",{children:"6桁の認証コード"}),"が送信されます。 メールを確認してください。"]}),e.jsx(d,{children:"メールが届かない場合は、迷惑メールフォルダもご確認ください。"})]}),e.jsxs(i,{number:"2-2",title:"認証コードを入力",children:[e.jsxs("p",{children:["画面に表示された入力欄に6桁の認証コードを入力し、 「",e.jsx("strong",{children:"認証"}),"」ボタンを押します。"]}),e.jsxs(a,{children:["認証コードの有効期限は",e.jsx("strong",{children:"10分"}),"です。 期限切れの場合は、もう一度新規登録からやり直してください。"]})]}),e.jsx(i,{number:"2-3",title:"認証完了",children:e.jsxs("p",{children:["「認証が完了しました」と表示されたら、アカウント登録は完了です。 「",e.jsx("strong",{children:"ログインに戻る"}),"」をクリックしてログインに進みます。"]})})]}),e.jsxs("section",{id:"login",className:"guide-section",children:[e.jsx("h2",{className:"guide-section-title",children:"STEP 3: ログイン"}),e.jsx(i,{number:"3-1",title:"ログイン情報を入力",children:e.jsxs("p",{children:["登録したメールアドレスとパスワードを入力し、 「",e.jsx("strong",{children:"ログイン"}),"」ボタンを押します。"]})}),e.jsxs(i,{number:"3-2",title:"ログイン完了",children:[e.jsx("p",{children:"ログインに成功すると、会員ポータル画面（マイページ）に移動します。 左側のメニューから各機能にアクセスできます。"}),e.jsx(d,{children:"スマートフォンからもご利用いただけます。 ブラウザのブックマーク・ホーム画面への追加をおすすめします。"})]})]}),e.jsxs("section",{id:"reset",className:"guide-section",children:[e.jsx("h2",{className:"guide-section-title",children:"パスワードを忘れた場合"}),e.jsx(i,{number:"1",title:"パスワードリセット",children:e.jsxs("ol",{className:"guide-numbered-list",children:[e.jsxs("li",{children:["ログイン画面で「",e.jsx("strong",{children:"パスワードを忘れた方"}),"」をクリック"]}),e.jsxs("li",{children:["登録済みのメールアドレスを入力して「",e.jsx("strong",{children:"リセットメールを送信"}),"」をクリック"]}),e.jsx("li",{children:"届いたメールに記載されたリンクから新しいパスワードを設定"}),e.jsx("li",{children:"新しいパスワードでログインしてください"})]})})]}),e.jsxs("section",{id:"faq",className:"guide-section",children:[e.jsx("h2",{className:"guide-section-title",children:"よくある質問"}),e.jsxs("div",{className:"guide-faq",children:[e.jsxs("details",{className:"guide-faq-item",children:[e.jsx("summary",{children:"登録しようとすると「登録に失敗しました」と表示されます"}),e.jsx("p",{children:"会員情報に登録されているメールアドレスのみ利用可能です。 管理者（事務局）にメールアドレスが正しく登録されているかご確認ください。"})]}),e.jsxs("details",{className:"guide-faq-item",children:[e.jsx("summary",{children:"認証コードが届きません"}),e.jsx("p",{children:"迷惑メールフォルダをご確認ください。 それでも届かない場合は、メールアドレスが正しいか確認の上、 新規登録からやり直してください。"})]}),e.jsxs("details",{className:"guide-faq-item",children:[e.jsx("summary",{children:"「既にアカウント登録済みです」と表示されます"}),e.jsx("p",{children:"以前にアカウントを作成済みです。ログイン画面からメールアドレスとパスワードでログインしてください。 パスワードを忘れた場合は「パスワードを忘れた方」からリセットできます。"})]}),e.jsxs("details",{className:"guide-faq-item",children:[e.jsx("summary",{children:"ログイン後に「アクセス権限がありません」と表示されます"}),e.jsx("p",{children:"会員情報とアカウントの紐付けがうまくいっていない可能性があります。 管理者（事務局）にお問い合わせください。"})]}),e.jsxs("details",{className:"guide-faq-item",children:[e.jsx("summary",{children:"スマートフォンから使えますか？"}),e.jsx("p",{children:"はい、スマートフォンのブラウザ（Safari, Chrome等）からご利用いただけます。 ホーム画面にブックマークを追加すると便利です。"})]})]})]}),e.jsxs("section",{className:"guide-cta",children:[e.jsx("h3",{className:"guide-cta-title",children:"準備はできましたか？"}),e.jsx("p",{className:"guide-cta-text",children:"さっそくアカウントを作成して、会員システムをご利用ください。"}),e.jsx("div",{className:"guide-cta-buttons",children:e.jsx(s,{to:"/signin",className:"btn btn-primary",style:{fontSize:15,padding:"12px 32px"},children:"ログイン・新規登録へ"})})]})]}),e.jsx("footer",{className:"guide-footer",children:e.jsxs("p",{children:["© 水戸21の会 ─ ",n]})}),e.jsx("style",{children:`
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
      `})]})}export{x as default};
