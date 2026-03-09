# 実装進捗

## ステータス凡例
- `✅` 実装済み
- `🟡` 最小版を実装済み
- `⬜` 未着手

## Phase 1: コレクション
| 項目 | 状態 | 補足 |
|---|---|---|
| FiscalYears | 🟡 | M4/M5 向けの年度一覧に加え、A8 最小版で一覧・追加・編集・現在年度切替を実装 |
| Members | 🟡 | P1/P2、A4、A2、A3、M1、M2、M3 最小運用に必要な項目まで実装 |
| Organizations | 🟡 | M5 向けの閲覧用に加え、A6 最小版で一覧・保存を実装 |
| OrgAssignments | 🟡 | M5 向けの閲覧用に加え、A6 最小版で一覧・保存を実装 |
| Dues | 🟡 | A5 最小版向けに年度別一覧、納入状態更新、簡易集計に必要な項目を実装 |
| DueSettings | 🟡 | A5 最小版向けに年度別・会員種別ごとの会費金額設定を実装 |
| Newsletters | 🟡 | A7 下地版向けに配信設定の下書き保存・一覧・詳細と添付メタ情報の最小項目を実装 |
| OrgDocuments | 🟡 | M4/M6 の閲覧用に加え、A10 最小版で一覧・保存・公開切替を実装 |
| MemberChangeLogs | ⬜ | 未実装 |

## Phase 2: 公開画面
| 画面 | 状態 | 補足 |
|---|---|---|
| P1 入会申込フォーム | 🟡 | `/apply`、セクション分割、確認画面導線、追加項目入力の最小版を実装 |
| P2 申込完了画面 | 🟡 | `/apply/complete`、申込完了案内と次導線を最小表示 |

## Phase 3: 管理画面
| 画面 | 状態 | 補足 |
|---|---|---|
| A1 ダッシュボード | 🟡 | `/admin/dashboard`、会員数サマリー、未承認申込件数、当年度会費納入率、直近配信5件、主要導線を最小実装 |
| A2 会員一覧 | 🟡 | 会員一覧、検索、絞り込み、A3 導線を最小実装 |
| A3 会員詳細・編集 | 🟡 | 詳細表示、基本情報更新、名簿掲載フラグ更新を最小実装 |
| A4 入会申込管理 | 🟡 | 申請中一覧、詳細、紹介者照合、承認/却下を最小実装。自動採番、承認/却下メール、認証/権限制御は未実装 |
| A5 会費管理 | 🟡 | `/admin/dues-management`、年度選択、会費一覧、金額設定、納入状態更新、簡易集計を最小実装 |
| A6 組織管理 | 🟡 | `/admin/organization-chart`、年度選択、組織一覧、配属一覧、保存の最小版を実装 |
| A7 通知管理 | 🟡 | `/admin/newsletters`、下書き保存、一覧、詳細編集の下地版を実装。実送信は未接続 |
| A8 年度管理 | 🟡 | `/admin/fiscal-years`、年度一覧、追加、編集、現在年度切替の最小版を実装 |
| A9 設定 | 🟡 | `/admin/settings`、A8/A5/A10/A7 への導線と通知設定プレースホルダを持つ設定ハブの最小版を実装 |
| A10 文書管理 | 🟡 | `/admin/documents`、資料一覧、詳細編集、公開/非公開切替の最小版を実装 |

## Phase 4: 会員向け画面
| 画面 | 状態 | 補足 |
|---|---|---|
| M1 名簿閲覧 | 🟡 | 承認済・活動中のみの一覧、検索、M2 導線を最小実装 |
| M2 会員詳細 | 🟡 | 承認済・活動中のみ、公開フラグ反映の公開向け詳細を最小実装 |
| M3 マイページ | 🟡 | 仮 memberId 指定で本人情報確認と公開設定更新を最小実装 |
| M4 年次情報 | 🟡 | `/info`、年度セレクタ、4 区分タブ、公開済み文書表示の最小版を実装 |
| M5 組織表示 | 🟡 | `/organization`、年度セレクタ、組織カード、役職つき配属一覧の最小版を実装 |
| M6 文書閲覧 | 🟡 | `/manual`、公開中マニュアル一覧、本文・添付リンク表示の最小版を実装 |

## Backend Functions
| Function | 状態 | 補足 |
|---|---|---|
| health-check | ✅ | HTTP 疎通確認用 |
| register-member | 🟡 | 最小必須項目、email 重複チェック、申請中保存 |
| list-members | ✅ | 新しい順一覧の最小版 |
| send-application-notification | 🟡 | Resend 直呼び出し。secret 未設定時は skip |
| list-members-admin | ✅ | A2 用。検索、絞り込み、氏名昇順一覧 |
| get-admin-dashboard | ✅ | A1 用。会員数サマリー、未承認申込件数、当年度会費納入率、直近配信5件を取得 |
| list-directory-members | ✅ | M1 用。承認済・活動中のみ、公開フラグ反映 |
| get-directory-member-detail | ✅ | M2 用。承認済・活動中のみ、公開フラグ反映 |
| get-my-member-detail | ✅ | M3 用。仮 memberId 指定で本人情報取得 |
| list-fiscal-years | ✅ | M4 用。年度一覧と現在年度を取得 |
| list-fiscal-years-admin | ✅ | A8 用。年度一覧と導出状態を取得 |
| save-fiscal-year | ✅ | A8 用。年度の新規追加・編集保存を行う |
| set-current-fiscal-year | ✅ | A8 用。現在年度を 1 件に切り替える |
| list-dues-admin | ✅ | A5 用。年度別会費一覧、金額設定、簡易集計を取得 |
| save-due | ✅ | A5 用。会費の納入状態、入金日、備考を更新する |
| save-due-settings | ✅ | A5 用。年度別の会費金額設定を保存し、既存会費金額へ反映する |
| list-organization-chart-admin | ✅ | A6 用。年度別の組織・配属・会員候補を取得 |
| save-organization | ✅ | A6 用。組織の新規追加・編集保存を行う |
| save-org-assignment | ✅ | A6 用。配属の新規追加・編集保存を行う |
| delete-organization | ✅ | A6 用。配属や子組織がない組織を削除する |
| delete-org-assignment | ✅ | A6 用。配属を削除する |
| list-org-documents-admin | ✅ | A10 用。資料一覧を取得 |
| get-org-document-detail | ✅ | A10 用。資料詳細を取得 |
| save-org-document | ✅ | A10 用。資料の新規追加・編集保存を行う |
| toggle-org-document-published | ✅ | A10 用。資料の公開状態を切り替える |
| get-member-basic-info | ✅ | M4 用。年度別の公開済み基本情報文書を取得 |
| get-member-organization-chart | ✅ | M5 用。年度別の組織と配属一覧を取得 |
| get-member-manual | ✅ | M6 用。公開中の運用マニュアル一覧を取得 |
| list-newsletters-admin | ✅ | A7 用。配信設定一覧を取得 |
| get-newsletter-detail | ✅ | A7 用。配信設定詳細を取得 |
| save-newsletter-draft | ✅ | A7 用。下書き保存・更新を行う |
| preview-newsletter-audience | ✅ | A7 用。配信対象件数のプレビューを返す |
| list-pending-members | ✅ | 申請中一覧を取得 |
| get-member-detail | ✅ | 申込詳細と紹介者一致候補を取得 |
| update-member-detail | ✅ | A3/M3 用。会員詳細の最小更新 |
| approve-member | ✅ | 承認、member_type と member_number を確定 |
| reject-member | ✅ | 却下理由付きで却下 |

## 今回の判断
- `member_number` は docs に自動採番ルールがないため、A4 最小版では承認時の手入力必須にした
- `sendApprovalEmail` は未実装。承認/却下処理には差し込み位置だけ残している
- 管理画面の認証は未実装。現状は最小 UI のみ
- A4 は最小運用には到達しているが、会員番号自動採番、承認/却下通知メール、認証/権限制御が未実装のため `🟡` のままとした
- A2 は一覧・検索・絞り込み・A3 遷移導線までを最小実装
- A3 は詳細表示、基本情報更新、名簿掲載フラグ更新までを最小実装とし、変更履歴、CSV、会費・年度連携は未実装
- A1 は `/admin/dashboard` を追加し、未承認申込件数、会員数サマリー、当年度会費納入率、直近配信5件、主要画面へのクイックアクションを最小表示した
- A1 の当年度会費納入率は A5 と同じ canonical Due 優先ロジックで集計し、旧 Due データが残っていても二重計上しないようにした
- 公開/管理/会員の全体骨格を見直し、`/` を公開トップ、`/apply` を入会申込、`/apply/confirm` を確認、`/apply/complete` を完了として共通ナビ付きで再構成した
- 管理画面は左サイドバーと上部ヘッダー、会員画面は共通ヘッダーと導線、公開画面はトップナビを持つ共通 chrome に寄せた
- M1 は承認済・活動中会員のみを対象とし、公開フラグに応じた表示だけを最小実装した
- M2 は承認済・活動中会員のみを対象とし、公開フラグが true の項目だけを表示する最小公開詳細を実装した
- M3 は認証未実装のため `memberId` 仮指定で運用し、連絡先と名簿公開設定だけを更新できる最小版にした
- M4 は `/info` を追加し、FiscalYears と OrgDocuments を使って年度別の基本情報を 4 区分で閲覧できる最小版にした
- M4 の文書表示は `published = true` のみを対象とし、年度一致文書を優先、なければ年度未指定の常設文書を表示する
- A10 を実装したため、M4 の資料データは `/admin/documents` から最小管理できる
- M5 は `/organization` を追加し、FiscalYears・Organizations・OrgAssignments・Members を使って年度別の組織図を縦積みカードで閲覧できる最小版にした
- M5 の組織表示は年度一致の Organizations を `sort_order` 優先で並べ、配属は役職優先順と `sort_order` で表示する
- A6 は `/admin/organization-chart` を追加し、年度を選んで組織と配属を一覧・保存できる最小管理画面を実装した
- A6 の組織種別は `役員会` / `委員会` / `部会` / `その他` に固定し、役職名と委員会名は自由入力で扱う
- A6 の削除は organization / assignment ともに画面側から実行できる最小 UI まで接続した
- M6 は `/manual` を追加し、OrgDocuments の公開済み文書から運用マニュアル該当だけを抽出して一覧表示する最小版にした
- M6 の抽出条件は `doc_type` / `category` / `title` の文言を使った安全側判定とし、本文と添付リンクだけを最小表示する
- A10 の文書管理 UI は `/admin/documents` で最小実装済みのため、M4 / M6 に表示する資料は管理画面から登録・公開できる
- A7 は `Newsletter` entity と `/admin/newsletters` を追加し、下書き保存・一覧・詳細編集だけを行える下地版にした
- A7 は `channel` / `status` / `audience_type` / `audience_filter_json` を保存するが、対象件数計算や実送信はまだ行わない
- A7 の対象件数表示では送信対象ルールを `approval_status=承認済` かつ `status=活動中` に固定し、その母集団に対して `all` / `member_type` / `status` / `approval_status` の件数だけ返す最小 preview を追加した
- A7 の添付対応では `attachments_json` を追加し、実ファイルアップロードなしで添付表示名とURLを1件分保存・表示できるようにした
- A8 は `/admin/fiscal-years` を追加し、FiscalYears の一覧・新規追加・編集保存・現在年度切替を行える最小管理画面を実装した
- A8 の状態表示は entity 追加なしで `開始前` / `開放中` / `締了` を日付から導出し、`is_current=true` は保存時と切替時の両方で 1 件だけにそろえる
- A5 は `/admin/dues-management` を追加し、年度ごとの会費一覧、正会員/賛助会員の金額設定、納入状態更新、簡易集計を行える最小版を実装した
- A5 の会費一覧は `承認済` かつ `活動中` の正会員/賛助会員だけを対象とし、不足する Dues は金額設定保存時に当年度分を自動生成する暫定措置とした
- A10 は `/admin/documents` を追加し、OrgDocuments の一覧・新規追加・編集保存・公開/非公開切替を行える最小管理画面を実装した
- A10 の `doc_type` は `事業計画` / `団体理念` / `会則・規約` / `年間スケジュール` / `運用マニュアル` の canonical 値で保存し、M4 / M6 の参照条件と揃える
- A10 の `attachment` は現行 entity 定義に合わせて URL 文字列のまま保持し、`category` は `運用マニュアル` のときだけ編集・保持できるようにした
- A9 は `/admin/settings` を追加し、A8 年度管理、A5 会費管理、A10 文書管理、A7 配信管理への導線をまとめる設定ハブとして最小実装した
- A9 では Resend / LINE / secret 保存 UI はまだ持たず、通知設定は今後追加予定のプレースホルダに留めた
- Resend / LINE 接続、送信ジョブ、予約送信実行、添付本実装は未着手のため、A7 は `🟡` のままとした

## 直近の次ステップ
1. A6 の親子関係と並び順の調整 UI
2. Resend 接続
3. LINE 接続の設計
