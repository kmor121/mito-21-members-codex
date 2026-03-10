# 実装進捗

## ステータス凡例
- `✅` 実装済み（完成版）
- `🟡` 最小版を実装済み
- `⬜` 未着手

## Phase 1: コレクション
| 項目 | 状態 | 補足 |
|---|---|---|
| FiscalYears | ✅ | 年度一覧・追加・編集・現在年度切替・年度移行 |
| Members | ✅ | 全フィールド実装。role(admin/member)による権限管理対応 |
| Organizations | ✅ | 親子階層対応。年度コピー機能あり |
| OrgAssignments | ✅ | 組織配属。年度コピー対応 |
| Dues | ✅ | 年度別会費。一括更新・リマインド送信対応。due_type(年会費/入会金/後期入会会費)対応 |
| DueSettings | ✅ | 年度別1レコード。5フィールド(正会員年会費/賛助会員年会費/入会金/前期会費/後期会費) |
| Newsletters | ✅ | 配信設定。Resend API 経由の実送信・予約送信対応 |
| OrgDocuments | ✅ | 資料管理。公開/非公開切替対応 |
| MemberChangeLogs | ✅ | 会員情報の変更履歴（フィールド単位の before/after 記録） |

## Phase 2: 公開画面
| 画面 | 状態 | 補足 |
|---|---|---|
| P1 入会申込フォーム | ✅ | セクション分割、確認画面導線 |
| P2 申込完了画面 | ✅ | 申込完了案内と次導線 |

## Phase 3: 管理画面
| 画面 | 状態 | 補足 |
|---|---|---|
| A1 ダッシュボード | ✅ | 会員数サマリー、未承認件数、会費納入率、直近配信、主要導線 |
| A2 会員一覧 | ✅ | リアルタイム検索(debounce 300ms)、所属フィルタ、新入/卒業生バッジ、インライン編集モード(自動保存) |
| A3 会員詳細・編集 | ✅ | 5タブ構成、全フィールド編集、変更ログ記録、防御的API呼び出し(部分データでも表示) |
| A4 入会申込管理 | ✅ | ステータスタブ切替、カード型一覧(新しい順)、セクション別詳細表示、承認/却下確認モーダル、紹介者照合可視化(✓/⚠)、会員番号自動採番、承認済/却下済は操作非表示 |
| A5 会費管理 | ✅ | テーブル+モーダル構成、集計サマリー常時表示(納入率%/年会費・入会金区分)、ステータスバッジクリック消込、入金日入力付き確認ダイアログ、チェックボックス一括納入済、全員納入済ボタン、会費設定モーダル(5項目: 正会員/賛助会員年会費・入会金・前期/後期入会会費)、リマインドメール |
| A6 組織管理 | ✅ | 親子ツリー表示、組織・配属CRUD、前年度コピー、ドラッグ&ドロップ並び替え |
| A7 配信管理 | ✅ | マスター・ディテール構成、ステータスタブ切替、チャネルトグル、セグメント選択、予約送信、スケルトンUI、トースト通知 |
| A8 年度管理 | ✅ | テーブル+モーダル構成、年度一覧、追加、編集、現在年度切替、年度移行(卒業生フラグ自動更新対応) |
| A9 設定 | ✅ | 管理画面リンク、メール配信設定表示、LINE設定(準備中)、管理者アカウント管理(権限付与/剥奪) |
| A10 文書管理 | ✅ | テーブル+モーダル構成、ドラッグ&ドロップ並び替え、TipTapリッチテキストエディタ、公開/非公開トグル |

## Phase 4: 会員向け画面
| 画面 | 状態 | 補足 |
|---|---|---|
| M1 会員名簿 | ✅ | フリガナ検索、所属フィルタ、組織配属表示、新入・卒業生バッジ |
| M2 会員詳細 | ✅ | 公開フラグ反映、組織配属・誕生日・入会年・会社詳細 |
| M3 マイページ | ✅ | 全フィールド編集、変更ログ記録 |
| M4 年次情報 | ✅ | 年度セレクタ、4区分タブ、公開済み文書表示 |
| M5 組織表示 | ✅ | 親子ツリー表示、メンバー写真、M2リンク |
| M6 文書閲覧 | ✅ | カテゴリ別グルーピング表示、公開中マニュアル一覧 |

## Backend Functions
| Function | 状態 | 補足 |
|---|---|---|
| health-check | ✅ | HTTP疎通確認 |
| register-member | ✅ | company_name任意、email重複チェック |
| list-members | ✅ | 新しい順一覧 |
| send-application-notification | ✅ | Resend API経由の申込通知 |
| list-members-admin | ✅ | 検索・委員会フィルタ・組織配属表示 |
| get-admin-dashboard | ✅ | 会員数・会費・配信サマリー |
| list-directory-members | ✅ | 委員会フィルタ・組織配属表示 |
| get-directory-member-detail | ✅ | 公開フラグ反映・組織配属 |
| get-my-member-detail | ✅ | 全フィールド取得 |
| update-member-detail | ✅ | 全フィールド更新・変更ログ記録 |
| get-member-history | ✅ | 組織履歴・会費履歴 |
| get-member-change-logs | ✅ | 変更履歴一覧 |
| generate-member-number | ✅ | 年度ベースの自動採番(YY+連番3桁) |
| approve-member | ✅ | 承認処理+ウェルカムメール送信(Resend)+入会金/年会費Dues自動生成(前期/後期判定) |
| reject-member | ✅ | 却下処理+却下通知メール送信(Resend) |
| list-admin-members | ✅ | 承認済会員一覧(role付き、管理者優先ソート) |
| toggle-member-role | ✅ | 会員のrole(admin/member)切替 |
| list-fiscal-years | ✅ | 年度一覧と現在年度 |
| list-fiscal-years-admin | ✅ | 年度一覧と導出状態 |
| save-fiscal-year | ✅ | 年度の新規追加・編集 |
| set-current-fiscal-year | ✅ | 現在年度切替 |
| execute-fiscal-year-transition | ✅ | 年度移行(組織コピー/会費生成(due_type付き)/is_newリセット) |
| list-dues-admin | ✅ | 年度別会費一覧・集計(due_type/is_new対応、新入会員複数レコード対応) |
| save-due | ✅ | 納入状態更新 |
| save-due-settings | ✅ | 会費金額設定(5フィールド1レコード形式、旧スキーマ自動クリーンアップ) |
| batch-update-dues | ✅ | 一括ステータス更新 |
| send-due-reminder | ✅ | リマインドメール送信(Resend) |
| send-newsletter | ✅ | Resend実送信・予約送信 |
| list-organization-chart-admin | ✅ | 年度別組織・配属 |
| save-organization | ✅ | 組織保存 |
| save-org-assignment | ✅ | 配属保存 |
| delete-organization | ✅ | 組織削除 |
| delete-org-assignment | ✅ | 配属削除 |
| copy-organizations-to-year | ✅ | 前年度組織・配属コピー |
| list-org-documents-admin | ✅ | 資料一覧 |
| get-org-document-detail | ✅ | 資料詳細 |
| save-org-document | ✅ | 資料保存 |
| toggle-org-document-published | ✅ | 公開状態切替 |
| get-member-basic-info | ✅ | 年度別基本情報文書 |
| get-member-organization-chart | ✅ | 年度別組織・配属一覧 |
| get-member-manual | ✅ | 公開中マニュアル一覧 |
| list-newsletters-admin | ✅ | 配信設定一覧 |
| get-newsletter-detail | ✅ | 配信設定詳細 |
| save-newsletter-draft | ✅ | 下書き保存 |
| preview-newsletter-audience | ✅ | 配信対象件数プレビュー |
| list-pending-members | ✅ | 申請中一覧 |
| get-member-detail | ✅ | 申込詳細と紹介者候補 |

## UI/UX改善
- トースト通知: 全画面で統一（保存成功、エラー、送信完了）
- A7 配信管理: マスター・ディテール構成、ステータスタブ、チャネルトグル、スケルトンUI、送信アニメーション
- A2 会員一覧: リアルタイム検索(debounce 300ms)、インライン編集モード(自動保存1s)、新入/卒業生バッジ
- A4 入会申込管理: 承認/却下確認モーダル、紹介者照合可視化（green/yellow pill）
- A6 組織管理: ドラッグ&ドロップ並び替え
- A8 年度管理: テーブル+モーダルUI、卒業生フラグ自動更新オプション
- A10 文書管理: テーブル+モーダルUI、ドラッグ&ドロップ並び替え、TipTapリッチテキストエディタ
- M1 会員名簿: 新入/卒業生バッジ表示
- M6 運用マニュアル: カテゴリ別グルーピング表示
- 全体: ErrorBoundary導入（白画面クラッシュ防止）
- 全体: ヘッダー「公開トップ」→「トップ」、「名簿閲覧」→「会員名簿」に名称統一
- P1 入会申込: 生年月日を年/月/日3ドロップダウンに変更
- データモデル: member_typeに「名誉顧問」追加、is_graduateフィールド追加、org_type「役員会」→「幹事会」変更

## 残課題
- 全体: 認証・権限制御の実装（Auth0/Clerk連携）
- LINE連携: Messaging API実装（後フェーズ）
- CSV入出力: A2でのCSVインポート/エクスポート
- HTML形式メール: A7でのリッチテキスト対応
