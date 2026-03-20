import{r as e,j as i}from"./index-DckVKgGy.js";function a(){const r=window.location.origin.replace("https://","").replace("http://","");e.useEffect(()=>{window.scrollTo(0,0)},[]);const t=`
<!-- HEADER -->
<div class="rg-header">
  <div class="rg-header-left">
    <div class="rg-header-logo">21</div>
    <div>
      <h1>会員アプリ ご利用ガイド</h1>
      <p>新規登録・ログイン・パスワード再設定の手順</p>
    </div>
  </div>
  <a href="/signin" class="rg-header-login">ログインへ →</a>
</div>

<div class="rg-container">

  <!-- 注意書き -->
  <div class="rg-callout rg-callout-info" style="margin-bottom: 32px;">
    <strong>ご案内</strong><br>
    会員アプリをご利用いただくには、事前に事務局が会員登録を行っている必要があります。<br>
    ご登録メールアドレス宛に案内が届いていない場合は、事務局までお問い合わせください。
  </div>

  <!-- 目次 -->
  <div class="rg-toc">
    <h2>目次</h2>
    <ul>
      <li><a href="#section1"><span class="rg-toc-num">1</span> はじめてご利用の方（新規登録）</a></li>
      <li><a href="#section2"><span class="rg-toc-num">2</span> 2回目以降のログイン</a></li>
      <li><a href="#section3"><span class="rg-toc-num">3</span> パスワードを忘れた場合</a></li>
      <li><a href="#section4"><span class="rg-toc-num">4</span> よくあるご質問</a></li>
    </ul>
  </div>

  <!-- ══════════════════════════════════════════ -->
  <!-- SECTION 1: 新規登録 -->
  <!-- ══════════════════════════════════════════ -->
  <div class="rg-section" id="section1">
    <div class="rg-section-title">
      <span class="rg-num">1</span>
      はじめてご利用の方（新規登録）
    </div>
    <p class="rg-section-desc">
      初回のみ、パスワードの設定とメール認証が必要です。所要時間は約3分です。
    </p>

    <!-- Step Flow -->
    <div class="rg-step-flow">
      <span class="rg-step-chip rg-active">アプリを開く</span>
      <span class="rg-step-arrow">→</span>
      <span class="rg-step-chip rg-pending">新規登録</span>
      <span class="rg-step-arrow">→</span>
      <span class="rg-step-chip rg-pending">認証コード入力</span>
      <span class="rg-step-arrow">→</span>
      <span class="rg-step-chip rg-pending">完了</span>
    </div>

    <!-- Step 1-1 -->
    <div class="rg-sub-step">
      <h4>① アプリにアクセス</h4>
      <p>以下のURLをブラウザで開いてください。スマートフォン・PCどちらでもご利用いただけます。</p>

      <div class="rg-callout rg-callout-info">
        <strong>アプリURL</strong><br>
        ${r}/signin
      </div>

      <div class="rg-mockup">
        <div class="rg-mockup-bar">
          <div class="rg-dot"></div><div class="rg-dot"></div><div class="rg-dot"></div>
          <div class="rg-url">${r}/signin</div>
        </div>
        <div class="rg-mockup-body" style="text-align: center;">
          <div style="margin-bottom: 20px;">
            <div style="width: 48px; height: 48px; background: var(--rg-primary); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 700;">21</div>
          </div>
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">水戸21の会</div>
          <div style="font-size: 13px; color: var(--rg-text-muted); margin-bottom: 24px;">会員管理アプリ</div>

          <label class="rg-mock-input-label" style="text-align: left;">メールアドレス</label>
          <div class="rg-mock-input" style="text-align: left; color: var(--rg-text-muted);">example@email.com</div>

          <label class="rg-mock-input-label" style="text-align: left;">パスワード</label>
          <div class="rg-mock-input" style="text-align: left; color: var(--rg-text-muted);">••••••••</div>

          <div class="rg-mock-btn rg-mock-btn-primary" style="margin-top: 8px;">ログイン</div>
          <div class="rg-mock-link">パスワードを忘れた方</div>
          <div class="rg-mock-divider">または</div>
          <div class="rg-mock-btn rg-mock-btn-outline">
            ✦ 新規登録はこちら
          </div>
        </div>
      </div>
    </div>

    <!-- Step 1-2 -->
    <div class="rg-sub-step">
      <h4>② 「新規登録はこちら」をタップ</h4>
      <p>ログイン画面の下にある<strong>「新規登録はこちら」</strong>ボタンをタップしてください。</p>
    </div>

    <!-- Step 1-3 -->
    <div class="rg-sub-step">
      <h4>③ メールアドレスとパスワードを入力</h4>
      <p>事務局に届け出ているメールアドレスと、ご自身で決めたパスワードを入力してください。</p>

      <div class="rg-mockup">
        <div class="rg-mockup-bar">
          <div class="rg-dot"></div><div class="rg-dot"></div><div class="rg-dot"></div>
          <div class="rg-url">${r}/signin</div>
        </div>
        <div class="rg-mockup-body" style="text-align: center;">
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">新規登録</div>
          <div style="font-size: 13px; color: var(--rg-text-muted); margin-bottom: 24px;">事務局に届け出たメールアドレスで登録してください</div>

          <label class="rg-mock-input-label" style="text-align: left;">メールアドレス</label>
          <div class="rg-mock-input rg-filled" style="text-align: left;">taro.mito@example.com</div>

          <label class="rg-mock-input-label" style="text-align: left;">パスワード（8文字以上）</label>
          <div class="rg-mock-input rg-filled" style="text-align: left;">••••••••••</div>

          <label class="rg-mock-input-label" style="text-align: left;">パスワード（確認）</label>
          <div class="rg-mock-input rg-filled" style="text-align: left;">••••••••••</div>

          <div class="rg-mock-btn rg-mock-btn-primary" style="margin-top: 8px;">登録する</div>
          <div class="rg-mock-link">← ログイン画面に戻る</div>
        </div>
      </div>

      <div class="rg-callout rg-callout-warning">
        <strong>ご注意</strong><br>
        ・事務局に届け出ていないメールアドレスでは登録できません。<br>
        ・パスワードは<strong>8文字以上</strong>で設定してください。<br>
        ・お忘れにならないよう、安全な場所にお控えください。
      </div>
    </div>

    <!-- Step 1-4 -->
    <div class="rg-sub-step">
      <h4>④ メールで届く認証コードを確認</h4>
      <p>「登録する」を押すと、入力したメールアドレスに<strong>6桁の認証コード</strong>が届きます。</p>

      <div class="rg-callout rg-callout-warning">
        <strong>メールは英語で届きます</strong><br>
        認証コードのメールはシステムの都合上<strong>英語表記</strong>です。驚かれるかもしれませんが、正常な動作ですのでご安心ください。メール本文に記載された<strong>6桁の数字</strong>だけ確認すればOKです。
      </div>

      <!-- Email mockup -->
      <div class="rg-mockup">
        <div class="rg-mockup-bar">
          <div class="rg-dot"></div><div class="rg-dot"></div><div class="rg-dot"></div>
          <div class="rg-url" style="font-family: inherit;">📧 受信メール</div>
        </div>
        <div class="rg-mockup-body" style="text-align: left;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--rg-border);">
            <div style="width: 36px; height: 36px; background: #E8E6DF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--rg-text-muted); flex-shrink: 0;">✉</div>
            <div>
              <div style="font-size: 13px; font-weight: 600; color: var(--rg-text);">noreply@base44.com</div>
              <div style="font-size: 12px; color: var(--rg-text-muted);">To: taro.mito@example.com</div>
            </div>
          </div>
          <div style="font-size: 15px; font-weight: 600; color: var(--rg-text); margin-bottom: 16px;">
            Your verification code
          </div>
          <div style="font-size: 14px; color: var(--rg-text-secondary); line-height: 1.7; margin-bottom: 20px;">
            Hi,<br><br>
            Your verification code is:
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; padding: 16px 32px; background: var(--rg-primary-light); border: 2px solid var(--rg-primary); border-radius: 12px; font-size: 32px; font-weight: 700; color: var(--rg-primary); letter-spacing: 8px;">385291</span>
          </div>
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="font-size: 13px; color: var(--rg-primary); font-weight: 600;">↑ この6桁の数字を入力してください</span>
          </div>
          <div style="font-size: 13px; color: var(--rg-text-muted); line-height: 1.7;">
            This code will expire in 10 minutes.<br>
            If you didn't request this code, please ignore this email.
          </div>
        </div>
      </div>

      <p style="margin-top: 16px;">届いたメールの<strong>6桁の数字</strong>を、アプリの画面に入力してください。</p>

      <!-- OTP input screen mockup -->
      <div class="rg-mockup">
        <div class="rg-mockup-bar">
          <div class="rg-dot"></div><div class="rg-dot"></div><div class="rg-dot"></div>
          <div class="rg-url">${r}/signin</div>
        </div>
        <div class="rg-mockup-body" style="text-align: center;">
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">認証コードの入力</div>
          <div style="font-size: 13px; color: var(--rg-text-muted); margin-bottom: 24px;">
            taro.mito@example.com 宛にコードを送信しました
          </div>

          <div class="rg-otp-row">
            <div class="rg-otp-box rg-filled">3</div>
            <div class="rg-otp-box rg-filled">8</div>
            <div class="rg-otp-box rg-filled">5</div>
            <div class="rg-otp-box rg-filled">2</div>
            <div class="rg-otp-box rg-filled">9</div>
            <div class="rg-otp-box rg-filled">1</div>
          </div>

          <div class="rg-mock-btn rg-mock-btn-primary" style="margin-top: 16px;">確認する</div>
          <div class="rg-mock-link" style="margin-top: 16px;">コードが届かない場合は再送する</div>
        </div>
      </div>

      <div class="rg-callout rg-callout-info">
        <strong>メールが届かない場合</strong><br>
        ・迷惑メールフォルダをご確認ください。<br>
        ・数分待ってから「再送する」をタップしてください。<br>
        ・送信元は <strong>noreply@base44.com</strong> です。受信許可設定をお願いいたします。<br>
        ・キャリアメール（docomo, au, SoftBank）をお使いの場合は、このアドレスからの受信を許可してください。
      </div>
    </div>

    <!-- Step 1-5 -->
    <div class="rg-sub-step">
      <h4>⑤ 登録完了</h4>
      <p>認証が完了すると、自動的にアプリのトップページ（マイページ）が表示されます。これで登録は完了です。</p>

      <div class="rg-callout rg-callout-success">
        <strong>登録完了</strong><br>
        次回からは、メールアドレスとパスワードだけでログインできます。
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════ -->
  <!-- SECTION 2: ログイン -->
  <!-- ══════════════════════════════════════════ -->
  <div class="rg-section" id="section2">
    <div class="rg-section-title">
      <span class="rg-num">2</span>
      2回目以降のログイン
    </div>
    <p class="rg-section-desc">
      登録済みの方は、メールアドレスとパスワードでログインしてください。
    </p>

    <div class="rg-sub-step">
      <h4>① ログイン画面を開く</h4>
      <p>アプリのURLにアクセスします。</p>

      <div class="rg-callout rg-callout-info">
        <strong>アプリURL</strong><br>
        ${r}/signin
      </div>
    </div>

    <div class="rg-sub-step">
      <h4>② メールアドレスとパスワードを入力</h4>
      <p>登録時に使用したメールアドレスとパスワードを入力し、<strong>「ログイン」</strong>をタップしてください。</p>

      <div class="rg-mockup">
        <div class="rg-mockup-bar">
          <div class="rg-dot"></div><div class="rg-dot"></div><div class="rg-dot"></div>
          <div class="rg-url">${r}/signin</div>
        </div>
        <div class="rg-mockup-body" style="text-align: center;">
          <div style="margin-bottom: 20px;">
            <div style="width: 48px; height: 48px; background: var(--rg-primary); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: 700;">21</div>
          </div>
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 24px;">水戸21の会</div>

          <label class="rg-mock-input-label" style="text-align: left;">メールアドレス</label>
          <div class="rg-mock-input rg-filled" style="text-align: left;">taro.mito@example.com</div>

          <label class="rg-mock-input-label" style="text-align: left;">パスワード</label>
          <div class="rg-mock-input rg-filled" style="text-align: left;">••••••••••</div>

          <div class="rg-mock-btn rg-mock-btn-primary" style="margin-top: 8px;">ログイン</div>
        </div>
      </div>
    </div>

    <div class="rg-sub-step">
      <h4>③ ログイン完了</h4>
      <p>正しく入力すると、アプリのトップページが表示されます。</p>
    </div>
  </div>

  <!-- ══════════════════════════════════════════ -->
  <!-- SECTION 3: パスワードリセット -->
  <!-- ══════════════════════════════════════════ -->
  <div class="rg-section" id="section3">
    <div class="rg-section-title">
      <span class="rg-num">3</span>
      パスワードを忘れた場合
    </div>
    <p class="rg-section-desc">
      パスワードを忘れた場合は、以下の手順で再設定できます。
    </p>

    <div class="rg-sub-step">
      <h4>① ログイン画面で「パスワードを忘れた方」をタップ</h4>
      <p>ログイン画面の下にあるリンクをタップしてください。</p>
    </div>

    <div class="rg-sub-step">
      <h4>② メールアドレスを入力</h4>
      <p>登録時に使用したメールアドレスを入力し、送信してください。</p>

      <div class="rg-mockup">
        <div class="rg-mockup-bar">
          <div class="rg-dot"></div><div class="rg-dot"></div><div class="rg-dot"></div>
          <div class="rg-url">${r}/signin</div>
        </div>
        <div class="rg-mockup-body" style="text-align: center;">
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">パスワード再設定</div>
          <div style="font-size: 13px; color: var(--rg-text-muted); margin-bottom: 24px;">
            登録済みのメールアドレスを入力してください
          </div>

          <label class="rg-mock-input-label" style="text-align: left;">メールアドレス</label>
          <div class="rg-mock-input rg-filled" style="text-align: left;">taro.mito@example.com</div>

          <div class="rg-mock-btn rg-mock-btn-primary" style="margin-top: 8px;">再設定メールを送信</div>
          <div class="rg-mock-link">← ログイン画面に戻る</div>
        </div>
      </div>
    </div>

    <div class="rg-sub-step">
      <h4>③ 届いたメールのリンクを開く</h4>
      <p>パスワード再設定のメールが届きます。こちらも<strong>英語のメール</strong>です。メール内のボタンまたはリンクを押してください。</p>

      <!-- Password reset email mockup -->
      <div class="rg-mockup">
        <div class="rg-mockup-bar">
          <div class="rg-dot"></div><div class="rg-dot"></div><div class="rg-dot"></div>
          <div class="rg-url" style="font-family: inherit;">📧 受信メール</div>
        </div>
        <div class="rg-mockup-body" style="text-align: left;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--rg-border);">
            <div style="width: 36px; height: 36px; background: #E8E6DF; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; color: var(--rg-text-muted); flex-shrink: 0;">✉</div>
            <div>
              <div style="font-size: 13px; font-weight: 600; color: var(--rg-text);">noreply@base44.com</div>
              <div style="font-size: 12px; color: var(--rg-text-muted);">To: taro.mito@example.com</div>
            </div>
          </div>
          <div style="font-size: 15px; font-weight: 600; color: var(--rg-text); margin-bottom: 16px;">
            Reset your password
          </div>
          <div style="font-size: 14px; color: var(--rg-text-secondary); line-height: 1.7; margin-bottom: 20px;">
            Hi,<br><br>
            We received a request to reset your password.<br>
            Click the button below to set a new password:
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <span style="display: inline-block; padding: 14px 32px; background: var(--rg-primary); color: white; border-radius: 8px; font-size: 14px; font-weight: 600;">Reset Password</span>
          </div>
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="font-size: 13px; color: var(--rg-primary); font-weight: 600;">↑ このボタンを押してください</span>
          </div>
          <div style="font-size: 13px; color: var(--rg-text-muted); line-height: 1.7;">
            If you didn't request a password reset, please ignore this email.
          </div>
        </div>
      </div>
    </div>

    <div class="rg-sub-step">
      <h4>④ 新しいパスワードを設定</h4>
      <p>リンクを開くとパスワード設定の画面が表示されます。この画面も<strong>英語表記</strong>です。</p>

      <!-- English password reset screen mockup -->
      <div class="rg-mockup">
        <div class="rg-mockup-bar">
          <div class="rg-dot"></div><div class="rg-dot"></div><div class="rg-dot"></div>
          <div class="rg-url">base44.com/reset-password</div>
        </div>
        <div class="rg-mockup-body" style="text-align: center;">
          <div style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">Reset Password</div>
          <div style="font-size: 13px; color: var(--rg-text-muted); margin-bottom: 24px;">Enter your new password below</div>

          <label class="rg-mock-input-label" style="text-align: left;">New Password <span style="font-size: 12px; color: var(--rg-text-muted);">← 新しいパスワード</span></label>
          <div class="rg-mock-input rg-filled" style="text-align: left;">••••••••••</div>

          <label class="rg-mock-input-label" style="text-align: left;">Confirm Password <span style="font-size: 12px; color: var(--rg-text-muted);">← もう一度入力</span></label>
          <div class="rg-mock-input rg-filled" style="text-align: left;">••••••••••</div>

          <div class="rg-mock-btn rg-mock-btn-primary" style="margin-top: 8px;">Reset Password <span style="font-size: 12px; font-weight: 400;">← ここを押す</span></div>
        </div>
      </div>

      <div class="rg-callout rg-callout-warning">
        <strong>英語画面の操作手順</strong><br>
        ① 「New Password」欄に新しいパスワードを入力<br>
        ② 「Confirm Password」欄にもう一度同じパスワードを入力<br>
        ③ 「Reset Password」ボタンを押す
      </div>
    </div>

    <div class="rg-sub-step">
      <h4>⑤ 再設定完了</h4>
      <p>パスワードの再設定が完了したら、ログイン画面に戻り、新しいパスワードでログインしてください。</p>
    </div>
  </div>

  <!-- ══════════════════════════════════════════ -->
  <!-- SECTION 4: FAQ -->
  <!-- ══════════════════════════════════════════ -->
  <div class="rg-section" id="section4">
    <div class="rg-section-title">
      <span class="rg-num">4</span>
      よくあるご質問
    </div>

    <div class="rg-card">
      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; color: var(--rg-primary); margin-bottom: 6px;">
          Q. 「このメールアドレスは登録されていません」と表示されます
        </div>
        <div style="font-size: 14px; color: var(--rg-text-secondary);">
          A. 事務局に届け出ているメールアドレスと異なるアドレスで登録しようとしている可能性があります。ご登録のメールアドレスがわからない場合は、事務局までお問い合わせください。
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; color: var(--rg-primary); margin-bottom: 6px;">
          Q. 認証コードが届きません
        </div>
        <div style="font-size: 14px; color: var(--rg-text-secondary);">
          A. 迷惑メールフォルダをご確認ください。送信元は <strong>noreply@base44.com</strong> です。キャリアメール（docomo, au, SoftBank）をお使いの場合は、このアドレスからの受信を許可する設定をお願いいたします。数分待っても届かない場合は「再送する」をお試しください。
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; color: var(--rg-primary); margin-bottom: 6px;">
          Q. パスワード再設定の画面が英語です
        </div>
        <div style="font-size: 14px; color: var(--rg-text-secondary);">
          A. 現在、パスワード再設定画面はシステムの都合で英語表記となっております。「New Password」欄に新しいパスワードを入力し、「Reset Password」ボタンを押してください。
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 600; color: var(--rg-primary); margin-bottom: 6px;">
          Q. スマートフォンのホーム画面にアプリを追加できますか？
        </div>
        <div style="font-size: 14px; color: var(--rg-text-secondary);">
          A. はい。ブラウザのメニューから「ホーム画面に追加」を選択していただくと、アプリのようにワンタップでアクセスできるようになります。<br>
          <strong>iPhone（Safari）:</strong> 共有ボタン（□↑）→「ホーム画面に追加」<br>
          <strong>Android（Chrome）:</strong> 右上の「⋮」→「ホーム画面に追加」
        </div>
      </div>

      <div>
        <div style="font-size: 14px; font-weight: 600; color: var(--rg-primary); margin-bottom: 6px;">
          Q. メールアドレスを変更したいです
        </div>
        <div style="font-size: 14px; color: var(--rg-text-secondary);">
          A. メールアドレスの変更は事務局での対応が必要です。事務局までご連絡ください。
        </div>
      </div>
    </div>
  </div>

  <!-- CTA -->
  <div class="rg-card" style="text-align: center; margin-bottom: 16px;">
    <div style="font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--rg-text);">
      準備はできましたか？
    </div>
    <div style="font-size: 14px; color: var(--rg-text-secondary); margin-bottom: 20px;">
      さっそくアカウントを作成して、会員アプリをご利用ください。
    </div>
    <a href="/signin" style="display: inline-block; padding: 14px 40px; background: var(--rg-primary); color: white; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none;">
      ログイン・新規登録へ
    </a>
  </div>

  <!-- お問い合わせ -->
  <div class="rg-card" style="text-align: center; background: var(--rg-primary-light); border-color: transparent;">
    <div style="font-size: 15px; font-weight: 600; margin-bottom: 8px; color: var(--rg-primary-dark);">
      ご不明な点がございましたら
    </div>
    <div style="font-size: 14px; color: var(--rg-text-secondary);">
      水戸21の会 事務局までお気軽にお問い合わせください。
    </div>
  </div>

</div>

<div class="rg-footer">
  水戸21の会 会員管理アプリ ご利用ガイド
</div>
  `;return i.jsxs(i.Fragment,{children:[i.jsx("style",{children:`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700&display=swap');

        /* ── Scoped CSS variables (rg- prefix) ── */
        .rg-root {
          --rg-primary: #534AB7;
          --rg-primary-light: #EEEDFE;
          --rg-primary-dark: #3D3591;
          --rg-text: #2C2C2A;
          --rg-text-secondary: #5F5E5A;
          --rg-text-muted: #888780;
          --rg-bg: #FAFAF8;
          --rg-card-bg: #FFFFFF;
          --rg-border: #E8E6DF;
          --rg-success: #0D7C5F;
          --rg-success-light: #E1F5EE;
          --rg-warning: #B45309;
          --rg-warning-light: #FEF3C7;
          --rg-danger: #D32F2F;
          --rg-danger-light: #FCEBEB;
          --rg-radius: 12px;
          --rg-radius-sm: 8px;
        }

        .rg-root {
          font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--rg-bg);
          color: var(--rg-text);
          line-height: 1.8;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }
        .rg-root * { box-sizing: border-box; }

        /* ── Header ── */
        .rg-header {
          background: white;
          border-bottom: 1px solid var(--rg-border);
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          max-width: 780px;
          margin: 0 auto;
        }
        .rg-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .rg-header-logo {
          width: 48px; height: 48px;
          background: var(--rg-primary);
          border-radius: 12px;
          display: inline-flex; align-items: center; justify-content: center;
          color: white; font-size: 22px; font-weight: 700;
          flex-shrink: 0;
        }
        .rg-header h1 {
          font-size: 18px; font-weight: 700; color: var(--rg-text);
          margin: 0 0 2px;
        }
        .rg-header p {
          font-size: 12px; color: var(--rg-text-secondary);
          margin: 0;
        }
        .rg-header-login {
          display: inline-flex;
          align-items: center;
          padding: 8px 20px;
          background: var(--rg-primary);
          color: white;
          border-radius: var(--rg-radius-sm);
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .rg-header-login:hover {
          opacity: 0.9;
        }

        /* ── Container ── */
        .rg-container {
          max-width: 680px;
          margin: 0 auto;
          padding: 32px 20px 64px;
        }

        /* ── Section ── */
        .rg-section {
          margin-bottom: 40px;
        }
        .rg-section-title {
          font-size: 18px; font-weight: 700;
          color: var(--rg-text);
          margin: 0 0 8px;
          display: flex; align-items: center; gap: 10px;
        }
        .rg-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 32px; height: 32px;
          background: var(--rg-primary);
          color: white;
          border-radius: 50%;
          font-size: 14px; font-weight: 700;
          flex-shrink: 0;
        }
        .rg-section-desc {
          font-size: 14px; color: var(--rg-text-secondary);
          margin: 0 0 20px;
          padding-left: 42px;
        }

        /* ── Card ── */
        .rg-card {
          background: var(--rg-card-bg);
          border: 1px solid var(--rg-border);
          border-radius: var(--rg-radius);
          padding: 24px;
          margin-bottom: 16px;
        }

        /* ── Mockup Frame ── */
        .rg-mockup {
          background: var(--rg-card-bg);
          border: 1px solid var(--rg-border);
          border-radius: var(--rg-radius);
          overflow: hidden;
          margin-bottom: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .rg-mockup-bar {
          background: #F5F4F0;
          border-bottom: 1px solid var(--rg-border);
          padding: 10px 16px;
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: var(--rg-text-muted);
        }
        .rg-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #C4C3BE;
        }
        .rg-url {
          background: white;
          border: 1px solid var(--rg-border);
          border-radius: 4px;
          padding: 4px 12px;
          flex: 1;
          font-size: 11px;
          color: var(--rg-text-muted);
          font-family: monospace;
        }
        .rg-mockup-body {
          padding: 32px 24px;
        }

        /* ── Mock UI Components ── */
        .rg-mock-input {
          width: 100%;
          padding: 12px 14px;
          border: 1px solid var(--rg-border);
          border-radius: var(--rg-radius-sm);
          font-size: 14px;
          color: var(--rg-text);
          background: white;
          margin-bottom: 12px;
          font-family: inherit;
        }
        .rg-mock-input.rg-filled {
          border-color: var(--rg-primary);
          background: var(--rg-primary-light);
        }
        .rg-mock-input-label {
          font-size: 13px; font-weight: 500;
          color: var(--rg-text-secondary);
          margin-bottom: 6px;
          display: block;
        }
        .rg-mock-btn {
          display: block;
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: var(--rg-radius-sm);
          font-size: 15px; font-weight: 600;
          text-align: center;
          cursor: default;
          font-family: inherit;
        }
        .rg-mock-btn-primary {
          background: var(--rg-primary);
          color: white;
        }
        .rg-mock-btn-outline {
          background: white;
          color: var(--rg-primary);
          border: 1.5px solid var(--rg-primary);
          font-weight: 600;
          cursor: default;
        }
        .rg-mock-link {
          color: var(--rg-primary);
          font-size: 13px;
          text-decoration: underline;
          text-align: center;
          display: block;
          margin-top: 12px;
        }
        .rg-mock-divider {
          text-align: center;
          color: var(--rg-text-muted);
          font-size: 12px;
          margin: 16px 0;
          position: relative;
        }
        .rg-mock-divider::before, .rg-mock-divider::after {
          content: '';
          position: absolute; top: 50%;
          width: calc(50% - 30px);
          height: 1px; background: var(--rg-border);
        }
        .rg-mock-divider::before { left: 0; }
        .rg-mock-divider::after { right: 0; }

        /* ── Step indicators ── */
        .rg-step-flow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .rg-step-chip {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px; font-weight: 600;
          white-space: nowrap;
        }
        .rg-step-chip.rg-active {
          background: var(--rg-primary);
          color: white;
        }
        .rg-step-chip.rg-done {
          background: var(--rg-success-light);
          color: var(--rg-success);
        }
        .rg-step-chip.rg-pending {
          background: #F1EFE8;
          color: var(--rg-text-muted);
        }
        .rg-step-arrow {
          color: var(--rg-text-muted);
          font-size: 14px;
        }

        /* ── Callout ── */
        .rg-callout {
          padding: 16px 20px;
          border-radius: var(--rg-radius-sm);
          font-size: 13px;
          line-height: 1.7;
          margin-bottom: 16px;
        }
        .rg-callout-info {
          background: var(--rg-primary-light);
          color: var(--rg-primary-dark);
          border-left: 3px solid var(--rg-primary);
        }
        .rg-callout-warning {
          background: var(--rg-warning-light);
          color: var(--rg-warning);
          border-left: 3px solid var(--rg-warning);
        }
        .rg-callout-success {
          background: var(--rg-success-light);
          color: var(--rg-success);
          border-left: 3px solid var(--rg-success);
        }
        .rg-callout-danger {
          background: var(--rg-danger-light);
          color: var(--rg-danger);
          border-left: 3px solid var(--rg-danger);
        }
        .rg-callout strong { font-weight: 600; }

        /* ── OTP mockup ── */
        .rg-otp-row {
          display: flex; gap: 8px; justify-content: center; margin: 16px 0;
        }
        .rg-otp-box {
          width: 44px; height: 52px;
          border: 2px solid var(--rg-border);
          border-radius: var(--rg-radius-sm);
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; font-weight: 700; color: var(--rg-primary);
        }
        .rg-otp-box.rg-filled { border-color: var(--rg-primary); background: var(--rg-primary-light); }

        /* ── Table of Contents ── */
        .rg-toc {
          background: white;
          border: 1px solid var(--rg-border);
          border-radius: var(--rg-radius);
          padding: 24px;
          margin-bottom: 40px;
        }
        .rg-toc h2 {
          font-size: 15px; font-weight: 700;
          margin: 0 0 14px;
          color: var(--rg-text);
        }
        .rg-toc ul { list-style: none; margin: 0; padding: 0; }
        .rg-toc li {
          padding: 8px 0;
          border-bottom: 1px solid #F1EFE8;
          font-size: 14px;
        }
        .rg-toc li:last-child { border-bottom: none; }
        .rg-toc a {
          color: var(--rg-primary);
          text-decoration: none;
          display: flex; align-items: center; gap: 10px;
        }
        .rg-toc a:hover { text-decoration: underline; }
        .rg-toc-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px;
          background: var(--rg-primary-light);
          color: var(--rg-primary);
          border-radius: 50%;
          font-size: 12px; font-weight: 700;
          flex-shrink: 0;
        }

        /* ── Sub-step ── */
        .rg-sub-step {
          padding-left: 20px;
          border-left: 2px solid var(--rg-primary-light);
          margin-bottom: 24px;
        }
        .rg-sub-step h4 {
          font-size: 14px; font-weight: 600;
          color: var(--rg-text);
          margin: 0 0 8px;
        }
        .rg-sub-step p {
          font-size: 14px; color: var(--rg-text-secondary);
          margin: 0 0 12px;
        }

        /* ── Footer ── */
        .rg-footer {
          text-align: center;
          padding: 32px 20px;
          font-size: 12px;
          color: var(--rg-text-muted);
          border-top: 1px solid var(--rg-border);
          margin-top: 40px;
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .rg-container { padding: 20px 16px 48px; }
          .rg-card { padding: 20px 16px; }
          .rg-mockup-body { padding: 24px 16px; }
          .rg-header h1 { font-size: 19px; }
          .rg-section-desc { padding-left: 0; margin-top: 4px; }
          .rg-otp-box { width: 38px; height: 46px; font-size: 18px; }
        }

        /* ── Print ── */
        @media print {
          .rg-root { background: white; }
          .rg-mockup { break-inside: avoid; }
          .rg-section { break-inside: avoid; }
        }
      `}),i.jsx("div",{className:"rg-root",dangerouslySetInnerHTML:{__html:t}})]})}export{a as default};
