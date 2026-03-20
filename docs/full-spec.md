# 水戸２１の会 会員管理アプリ — 完全仕様書

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [会員種別](#会員種別)
   - [会員種別とデータモデルのマッピング](#会員種別とデータモデルのマッピング)
3. [ユーザーロール](#ユーザーロール)
4. [主要機能](#主要機能)
5. [技術構成](#技術構成)
   - [設計原則](#設計原則)
   - [認証・ログイン設計](#認証ログイン設計)
   - [デプロイ・移行計画](#デプロイ移行計画)
   - [デザインシステム](#デザインシステム)
6. [データモデル設計](#データモデル設計)
   - [1. Member（会員）](#1-member会員)
   - [2. FiscalYear（年度）](#2-fiscalyear年度)
   - [3. Organization（組織・委員会）](#3-organization組織委員会)
   - [4. OrgAssignment（組織配属）](#4-orgassignment組織配属)
   - [5. Due（会費）](#5-due会費)
   - [6. Newsletter（配信）](#6-newsletter配信)
   - [7. DueSetting（会費金額設定）](#7-duesetting会費金額設定)
   - [8. OrgDocument（団体資料）](#8-orgdocument団体資料)
   - [9. MemberChangeLog（会員情報変更ログ）](#9-memberchangelog会員情報変更ログ)
   - [10. Meeting（幹事会）](#10-meeting幹事会)
   - [11. Event（イベント）](#11-eventイベント)
   - [12. Attendance（出欠）](#12-attendance出欠)
   - [13. AppSettings（アプリ設定）](#13-appsettingsアプリ設定)
7. [バックエンド関数一覧](#バックエンド関数一覧)
8. [年度切替時の運用](#年度切替時の運用)
9. [リレーション図](#リレーション図)
10. [UI仕様](#ui仕様)
    - [画面一覧](#画面一覧)
    - [画面詳細](#画面詳細)
    - [管理メニュー順](#管理メニュー順)
    - [レスポンシブ対応](#レスポンシブ対応)
    - [画面遷移](#画面遷移)

---

# 第1部: プロジェクト概要

## プロジェクト概要
- プラットフォーム: Base44 (BaaS - Builderプランで検証)
- 目的: 任意団体（JC系に近い構成）の会員管理・会費管理・情報配信を一元化
- 対象ユーザー: 団体の管理者（役員・事務局）および一般会員
- 会員規模: 50〜200名
- 年度運営: 単年度制（毎年度で組織図が変わる）

## 会員種別
| 種別 | 説明 |
|------|------|
| 正会員 | 通常のアクティブ会員 |
| 正会員（休会） | 休会中の正会員 |
| 新入会員 | 当年度に新規入会した会員（is_new=trueで表現） |
| 名誉顧問 | 名誉顧問として参加する会員 |
| 賛助会員 | 賛助として参加する会員 |
| OB会員 | 退会・卒業した元会員 |

### 会員種別とデータモデルのマッピング
| 表示上の種別 | member_type | status | is_new |
|-------------|------------|--------|--------|
| 正会員 | 正会員 | 活動中 | false |
| 正会員（休会） | 正会員 | 休会 | false |
| 新入会員 | 正会員 | 活動中 | true |
| 賛助会員 | 賛助会員 | 活動中 | false |
| OB会員 | OB会員 | 退会 | false |
| 名誉顧問 | 名誉顧問 | 活動中 | false |

## ユーザーロール

### アプリ内ロール（app_role）
| ロール | 説明 |
|--------|------|
| admin_member | 管理者メンバー（全管理機能にアクセス可能） |
| manager | 幹事会メンバー（一部管理機能にアクセス可能） |
| member | 一般メンバー（会員向け画面のみ） |

### 管理者（役員・事務局）
- 会員情報のCRUD（登録・閲覧・編集・削除）
- 会費の入金ステータス管理
- 年度ごとの会費集計レポート
- メルマガ配信（Resend API経由）
- 組織図の年度別管理
- 幹事会管理（次第・議事録）
- イベント管理（RSVP・出欠管理）
- 年度切替操作

### 一般会員
- 会員名簿の閲覧（閲覧範囲は管理者が設定）
- 自身のプロフィール編集
- 幹事会・イベントの出欠回答
- 会費納入状況の確認

## 主要機能
1. **会員管理**: 会員情報の登録・編集・検索・一覧表示・Excel出力
2. **会費管理**: 入金ステータス管理（未納/納入済）、年度別集計レポート、未納者一覧
3. **組織図管理**: 年度ごとの役職・委員会構成の管理、前年度コピー
4. **配信管理**: Resend APIでのセグメント配信、HTML対応（TipTapリッチテキスト）、添付ファイル対応、予約送信対応、配信履歴管理、リマインダー送信
5. **幹事会管理**: 幹事会の次第・議事録管理、出欠管理、懇親会セット管理
6. **イベント管理**: イベントのRSVP管理、出欠率・所属別内訳、懇親会サポート
7. **名簿閲覧**: 会員向けの名簿表示（検索・フィルタ付き）
8. **基本情報**: 事業計画、団体理念・活動方針、会則・規約、年間スケジュールの閲覧
9. **運用マニュアル**: 会員向けの団体運営ルール・マニュアルの閲覧
10. **変更履歴**: 会員情報の変更ログ閲覧・Excel出力（会員名簿ダウンロード）
11. **入会申込**: 公開フォームからの入会申込・承認ワークフロー

## 技術構成
- フロントエンド: Vite + React（lazy loading, react-router-dom）
- バックエンド: Base44 BaaS（エンティティ + バックエンド関数）
- 外部連携: Resend（メール配信API）
- 認証: Base44デフォルト認証 + カスタムログイン画面（OTP認証、パスワードリセット対応）
- デザインシステム: CSS変数（tokens.css）+ 共通Reactコンポーネント

### 設計原則
- **Base44総合クレジットを消費しない方法で構築する**
- AI機能（Base44内蔵AI）はアプリ実行時には使用しない
- メール送信はBase44内蔵メールではなくResend API経由
- スケジュールタスク等でクレジット消費が発生する機能は採用しない
- バックエンド関数は外部API呼び出し等の非AI処理のみ使用
- 予約送信はBase44側でスケジュールタスクを使わず、Resend APIの`send_at`パラメータに全面依存する

### 認証・ログイン設計
- カスタムログイン画面（`src/pages/Login.jsx`）
- ログイン / 新規登録 / OTP認証 / パスワードリセットを1画面で切替
- 新規登録時: バックエンドで会員メールアドレス照合 → アカウント作成 → OTP認証
- `link-user-to-member` バックエンド関数でBase44ユーザーと会員レコードを紐付け
- 登録ガイドページ（`/guide`）で手順を案内

### デプロイ・移行計画
1. Builderプラン（検証用アカウント）でアプリを構築・検証
2. 完成後、Eliteプラン（本番アカウント）にアプリ所有権を移転
3. バックエンド関数のシークレット（APIキー等）は移転後に再設定

### デザインシステム
- **デザイントークン**: `src/styles/tokens.css` でカラー・タイポグラフィ・スペーシング・角丸・シャドウを定義
- **共通Reactコンポーネント**: `src/components/ui/` に Button, Card, PageHeader, Modal, YearPillNav, DatePicker, TimeSelect, MemberSelector 等
- **カラーパレット**: `--color-accent`（#2563eb）ベースの青系統。成功/警告/エラーのステータス色あり
- **旧CSS変数**（`--primary`, `--text`, `--line` 等）は完全に新トークンに移行済み
- **UI/UXスキルファイル**: `.claude/skills/ui-ux-guidelines/SKILL.md` に実装ルールを文書化

---

# 第2部: データモデル設計

## エンティティ一覧（14個）

| # | エンティティ名 | ファイル | 説明 |
|---|---------------|---------|------|
| 1 | Member | member.jsonc | 会員 |
| 2 | FiscalYear | fiscal-year.jsonc | 年度 |
| 3 | Organization | organization.jsonc | 組織・委員会 |
| 4 | OrgAssignment | org-assignment.jsonc | 組織配属 |
| 5 | Due | dues.jsonc | 会費 |
| 6 | Newsletter | newsletter.jsonc | 配信 |
| 7 | DueSetting | due-setting.jsonc | 会費金額設定 |
| 8 | OrgDocument | org-document.jsonc | 団体資料 |
| 9 | MemberChangeLog | member-change-log.jsonc | 会員情報変更ログ |
| 10 | Meeting | meeting.jsonc | 幹事会 |
| 11 | Event | event.jsonc | イベント |
| 12 | Attendance | attendance.jsonc | 出欠 |
| 13 | AppSettings | app-settings.jsonc | アプリ設定 |
| 14 | User | User.jsonc | Base44認証ユーザー |

### 1. Member（会員）
入会申込フォームの項目 + 管理用フィールド

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| last_name / first_name | string | 姓・名 |
| last_name_kana / first_name_kana | string | 姓名（ふりがな） |
| birthday | date | 生年月日 |
| join_date | date | 入会日 |
| member_number | string | 会員番号 |
| member_type | enum | 正会員 / 賛助会員 / OB会員 / 名誉顧問 |
| is_graduate | boolean | 卒業生フラグ（年度末時点で55歳以上） |
| status | enum | 活動中 / 休会 / 退会 |
| is_new | boolean | 新入会員フラグ（当年度入会） |
| approval_status | enum | 申請中 / 承認済 / 却下 |
| applied_at | datetime | 申込日時 |
| company_name, company_position, industry | string | 会社情報 |
| company_postal_code, company_address | string | 会社住所 |
| company_phone, company_fax | string | 会社電話・FAX |
| company_pr | text | 会社の概要・PR |
| email | string | メールアドレス |
| mobile_phone | string | 携帯番号 |
| show_email/mobile/company_in_directory | boolean | 名簿掲載可否 |
| home_postal_code, home_address, home_phone, home_fax | string | 自宅情報（名簿非公開） |
| hobbies | text | 趣味・信条 |
| referrer_1, referrer_2 | string | 紹介者名（必須） |
| profile_image | file | プロフィール画像 |
| rejection_reason | text | 却下理由 |
| role | enum | admin / member |
| app_role | enum | admin_member / manager / member |
| user_id | string | Base44認証ユーザーID（紐付け用） |
| line_user_id | string | LINE UID |
| notes | text | 備考（管理者用） |

### 2. FiscalYear（年度）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| year | number | 年度（例: 2025） |
| year_label | string | 年度ラベル（例: 2025年度） |
| start_date / end_date | date | 年度開始日・終了日 |
| is_current | boolean | 現在の年度フラグ |

### 3. Organization（組織・委員会）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| fiscal_year_id | relation | FiscalYearへの参照 |
| org_name | string | 組織名 |
| org_type | enum | 幹事会 / 委員会 / 部会 / 室 / その他 |
| parent_id | relation | 親組織（階層構造用） |
| supervisor_id | relation | 担当役員のMember ID |
| sort_order | number | 表示順 |

### 4. OrgAssignment（組織配属）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| fiscal_year_id | relation | FiscalYearへの参照 |
| organization_id | relation | Organizationへの参照 |
| member_id | relation | Memberへの参照 |
| role | string | 役職名（会長、副会長、委員長、委員等） |
| sort_order | number | 表示順 |

### 5. Due（会費）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| fiscal_year_id | relation | FiscalYearへの参照 |
| member_id | relation | Memberへの参照 |
| amount | number | 会費金額 |
| status | enum | 未納 / 納入済 |
| due_type | enum | 年会費 / 入会金 / 後期入会会費 |
| paid_date | date | 入金日 |
| payer_name | string | 入金者名 |
| notes | text | 備考 |

### 6. Newsletter（配信）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| subject | string | 件名 |
| body | richtext | 本文（TipTapリッチテキスト） |
| attachments | file[] | 添付ファイル |
| target_segment | enum | 全員 / 正会員のみ / 賛助会員のみ / カスタム |
| status | enum | 下書き / 予約中 / 送信済 |
| scheduled_at | datetime | 予約送信日時 |
| sent_at | datetime | 実際の送信日時 |
| sent_by | string | 送信者名 |
| failed_recipients_json | text | 送信失敗した受信者のJSON |

### 7. DueSetting（会費金額設定）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| fiscal_year_id | relation | FiscalYearへの参照 |
| regular_annual_fee | number | 正会員年会費（デフォルト: 30,000円） |
| associate_annual_fee | number | 賛助会員年会費（デフォルト: 10,000円） |
| admission_fee | number | 新入会員入会金（デフォルト: 10,000円） |
| first_half_fee | number | 前期入会会費（デフォルト: 30,000円） |
| second_half_fee | number | 後期入会会費（デフォルト: 15,000円） |

### 8. OrgDocument（団体資料）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| fiscal_year_id | relation | FiscalYearへの参照（運用マニュアル等はnull可） |
| doc_type | enum | 事業計画 / 団体理念 / 会則・規約 / 年間スケジュール / 運用マニュアル |
| title | string | タイトル |
| content | richtext | 本文 |
| attachment | file | 添付ファイル |
| category | string | カテゴリ（運用マニュアル用） |
| published | boolean | 公開フラグ |
| sort_order | number | 表示順 |

### 9. MemberChangeLog（会員情報変更ログ）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| member_id | relation | Memberへの参照 |
| changed_by | string | 変更者名 |
| changed_by_role | enum | member / admin |
| changed_at | datetime | 変更日時 |
| field_name | string | 変更されたフィールド名 |
| old_value | text | 変更前の値 |
| new_value | text | 変更後の値 |

### 10. Meeting（幹事会）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| fiscal_year_id | relation | FiscalYearへの参照 |
| title | string | 幹事会名（例: 第1回幹事会） |
| date / time | string | 開催日・時刻 |
| location | string | 開催場所 |
| status | enum | 下書き / 公開 / 完了 |
| agenda | richtext | 次第 |
| minutes | richtext | 議事録 |

### 11. Event（イベント）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| fiscal_year_id | relation | FiscalYearへの参照 |
| title | string | イベント名 |
| date / time / end_time | string | 開催日・時刻 |
| location | string | 開催場所 |
| description | richtext | 詳細説明 |
| status | enum | 下書き / 公開 / 完了 |
| is_after_party | boolean | 懇親会フラグ |
| parent_meeting_id | relation | 親幹事会ID（懇親会紐付け） |
| parent_event_id | relation | 親イベントID（懇親会紐付け） |

### 12. Attendance（出欠）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| event_id | relation | Eventへの参照 |
| meeting_id | relation | Meetingへの参照 |
| member_id | relation | Memberへの参照 |
| status | enum | 出席 / 欠席 / 未定 |
| response | enum | 出席 / 欠席 / 未回答 |
| responded_at | datetime | 回答日時 |
| comment | text | コメント |

### 13. AppSettings（アプリ設定）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| organization_name | string | 団体名 |
| email_signature | text | メール署名テンプレート |

---

## バックエンド関数一覧（27個 + _shared）

| # | 関数名 | 説明 |
|---|--------|------|
| 1 | approve-member | 入会申込の承認 |
| 2 | bulk-generate-dues | 会費レコードの一括生成 |
| 3 | bulk-invite-app-users | アプリユーザーの一括招待 |
| 4 | copy-organizations-to-year | 前年度の組織構成を新年度にコピー |
| 5 | create-member-admin | 管理者による会員の直接作成 |
| 6 | delete-fiscal-year | 年度の削除 |
| 7 | delete-member | 会員の削除（関連レコード含む） |
| 8 | delete-org-assignment | 組織配属の削除 |
| 9 | delete-organization | 組織の削除 |
| 10 | execute-fiscal-year-transition | 年度切替の実行 |
| 11 | generate-member-number | 会員番号の自動採番 |
| 12 | get-my-member-info | ログインユーザーの会員情報取得 |
| 13 | link-user-to-member | Base44ユーザーと会員レコードの紐付け |
| 14 | preview-newsletter-audience | 配信対象者のプレビュー |
| 15 | register-member | 入会申込の登録（公開フォームから） |
| 16 | reject-member | 入会申込の却下 |
| 17 | save-due | 会費レコードの保存 |
| 18 | save-due-settings | 会費金額設定の保存 |
| 19 | save-fiscal-year | 年度の保存 |
| 20 | save-org-assignment | 組織配属の保存 |
| 21 | save-org-document | 団体資料の保存 |
| 22 | save-organization | 組織の保存 |
| 23 | send-application-notification | 入会申込通知メール送信 |
| 24 | send-newsletter | 配信メールの送信（Resend API経由） |
| 25 | set-current-fiscal-year | 現在年度フラグの切替 |
| 26 | toggle-org-document-published | 団体資料の公開/非公開切替 |
| 27 | update-member-detail | 会員詳細の更新（変更ログ自動記録） |

※ `_shared` は共通ユーティリティ

---

## 年度切替時の運用

※ Memberエンティティは年度に依存しない。年度切替時に会員の基本情報はすべてそのまま引き継がれる。年度ごとに変わるのは以下のみ：
- OrgAssignment（組織配属・役職）
- Due（会費）
- OrgDocument（事業計画・年間スケジュール等の年度別資料）

1. 新年度のFiscalYearレコードを作成
2. Organizationを新年度用にコピー（または新規作成）
3. OrgAssignmentを新年度用に登録
4. Dueを新年度用に一括生成
5. 前年度のis_new = true の会員をfalseにリセット
6. 前年度のis_currentをfalseに、新年度をtrueに切替

### Dues一括生成ルール
- 金額はDueSettingの当年度×会員種別で自動決定
- 対象: status=「活動中」の正会員・賛助会員のみ
- 休会・退会ステータスの会員はDues一括生成の対象外

---

# 第3部: UI仕様

## 画面一覧

### 公開画面（ログイン不要）
| # | 画面名 | パス | ファイル | 概要 |
|---|--------|------|---------|------|
| P1 | 入会申込フォーム | /apply | Apply.jsx | 入会希望者が情報を入力 |
| P1b | 入会申込確認 | /apply/confirm | ApplyConfirm.jsx | 入力内容の確認・送信 |
| P2 | 申込完了画面 | /apply/complete | ApplyComplete.jsx | 送信完了メッセージ |
| P3 | 登録ガイド | /guide | RegistrationGuide.jsx | アカウント作成手順の案内 |
| - | ランディング | / | Landing.jsx | トップページ |
| - | ログイン | /signin | Login.jsx | ログイン・新規登録・OTP認証・パスワードリセット |

### 管理者向け画面
| # | 画面名 | パス | ファイル | 概要 |
|---|--------|------|---------|------|
| A1 | ダッシュボード | /admin/dashboard | Dashboard.jsx | 会員数サマリー、会費納入率、未承認通知 |
| A2 | 会員一覧 | /admin/members | MemberList.jsx | 検索・フィルタ・一覧、一括招待 |
| A3 | 会員詳細・編集 | /admin/members/:id | MemberDetail.jsx | 基本情報・組織履歴・会費履歴・変更履歴タブ |
| A3b | 会員新規作成 | /admin/members/new | MemberCreate.jsx | 管理者による会員直接作成 |
| A4 | 入会申込管理 | /admin/applications | Applications.jsx | 申込一覧の確認・承認・却下 |
| A4b | 申込詳細 | /admin/applications/:id | ApplicationDetail.jsx | 申込内容の全項目表示・承認/却下 |
| A5 | 会費管理 | /admin/dues-management | DuesManagement.jsx | 年度別会費一覧、入金管理、未納者一覧 |
| A6 | 組織図管理 | /admin/organization-chart | OrgChart.jsx | 年度別の組織・役職構成、ドラッグ並替 |
| A7 | 配信一覧 | /admin/newsletters | NewsletterList.jsx | 配信一覧・ステータス管理 |
| A7b | 配信編集 | /admin/newsletters/:id/edit | NewsletterEdit.jsx | リッチテキスト配信作成・プレビュー・送信 |
| A8 | 年度管理 | /admin/fiscal-years | FiscalYears.jsx | 年度作成・切替・年度初期化 |
| A9 | 設定 | /admin/settings | Settings.jsx | アプリ設定、管理者アカウント管理 |
| A10 | 資料管理 | /admin/documents | Documents.jsx | 資料一覧・公開/非公開切替 |
| A10b | 資料編集 | /admin/documents/:id/edit | DocumentEditor.jsx | リッチテキスト資料編集 |
| A11 | 幹事会管理 | /admin/meetings | Meetings.jsx | 幹事会一覧・新規作成 |
| A11b | 幹事会詳細 | /admin/meetings/:id | MeetingDetail.jsx | 次第・議事録・出欠管理・懇親会管理 |
| A12 | イベント管理 | /admin/events | Events.jsx | イベント一覧・新規作成 |
| A12b | イベント詳細 | /admin/events/:id | EventDetail.jsx | 出欠管理・回答率・所属別内訳・懇親会 |
| A13 | 変更履歴 | /admin/change-logs | ChangeLogs.jsx | 全会員の変更ログ一覧、Excel出力（会員名簿） |

### 会員向け画面
| # | 画面名 | パス | ファイル | 概要 |
|---|--------|------|---------|------|
| M1 | 会員名簿 | /directory | Directory.jsx | 検索・フィルタ・カード表示 |
| M2 | 会員詳細 | /directory/:id | MemberProfile.jsx | 公開情報表示 |
| M3 | マイページ | /mypage | MyPage.jsx | プロフィール確認・編集 |
| M4 | 基本情報 | /info | BasicInfo.jsx | 事業計画・理念・会則・年間スケジュール |
| M5 | 組織図 | /org-chart | OrgChartView.jsx | 組織図ツリー表示（閲覧専用） |
| M6 | 運用マニュアル | /manual | Manual.jsx | 運営ルール・マニュアル閲覧 |
| M7 | 幹事会 | /meetings | MeetingsView.jsx | 幹事会一覧・議事録閲覧・出欠回答 |
| M8 | イベント | /events | EventsView.jsx | イベント一覧・RSVP回答 |
| M9 | 入会申込状況 | /my-applications | MemberApplicationsView.jsx | 自分の申込状況確認 |
| M10 | 会費状況 | /my-dues | MemberDuesView.jsx | 自分の会費納入状況確認 |

## 管理メニュー順（サイドバー）
1. ダッシュボード
2. 会員一覧
3. 配信管理
4. 幹事会管理
5. イベント管理
6. 入会申込管理
7. 会費管理
8. 資料管理
9. 組織図管理
10. 年度管理
11. 設定

## レスポンシブ対応
- **ブレークポイント**: 1080px（サイドバー折りたたみ）、768px（レイアウト変更）、640px（フルモバイル）
- 入会申込フォーム: スマホ優先
- 管理者画面: PC優先（モバイル対応済み）
- 会員向け画面: スマホ優先（PCでも閲覧可）
- YearPillNav: モバイル時コンパクト表示（`‹ 2026年度 ›`）
- Modal: モバイル時フルスクリーン表示

## 画面遷移

【管理者】
ログイン → ダッシュボード(A1)
  ├── 会員一覧(A2) → 会員詳細・編集(A3) → 変更履歴(A13)
  │                 └── 会員新規作成(A3b)
  ├── 配信管理(A7) → 配信編集(A7b)
  ├── 幹事会管理(A11) → 幹事会詳細(A11b)
  ├── イベント管理(A12) → イベント詳細(A12b)
  ├── 入会申込管理(A4) → 申込詳細(A4b)
  ├── 会費管理(A5)
  ├── 資料管理(A10) → 資料編集(A10b)
  ├── 組織図管理(A6)
  ├── 年度管理(A8)
  └── 設定(A9)

【会員】
ログイン → マイページ(M3)
  ├── 会員名簿(M1) → 会員詳細(M2)
  ├── 幹事会(M7)
  ├── イベント(M8)
  ├── 基本情報(M4)
  ├── 組織図(M5) → 会員詳細(M2)
  ├── 運用マニュアル(M6)
  ├── 入会申込状況(M9)
  └── 会費状況(M10)

【公開】
ランディング(/) → ログイン(/signin)
入会申込フォーム(P1) → 確認(P1b) → 完了(P2)
登録ガイド(P3)
