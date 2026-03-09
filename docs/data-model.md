# データモデル設計（水戸２１の会）

## コレクション一覧

### 1. Members（会員）
入会申込フォームの項目 + 管理用フィールド

| フィールド | 型 | 説明 | 名簿表示 |
|-----------|-----|------|---------|
| id | auto | Base44自動ID | - |
| member_number | string | 会員番号 | - |
| name_kanji | string | 氏名（漢字） | ○ |
| name_kana | string | 氏名（ふりがな） | - |
| birthday | date | 生年月日 | ○ |
| join_date | date | 入会日 | ○（入会年） |
| member_type | enum | 正会員 / 賛助会員 / OB会員 | - |
| status | enum | 活動中 / 休会 / 退会 | - |
| approval_status | enum | 申請中 / 承認済 / 却下 | - |
| applied_at | datetime | 申込日時 | - |
| is_new | boolean | 新入会員フラグ（当年度入会） | - |
| **会社情報** | | | |
| company_name | string | 会社名 | ○ |
| company_position | string | 役職名 | ○ |
| industry | string | 業種 | - |
| company_postal_code | string | 会社住所（郵便番号） | ○ |
| company_address | string | 会社住所（番地まで） | ○ |
| company_phone | string | 会社電話番号 | ○ |
| company_fax | string | 会社FAX番号 | ○ |
| company_pr | text | 会社の概要・PR | - |
| show_company_in_directory | boolean | 会社情報の名簿掲載可否 | - |
| **個人連絡先** | | | |
| email | string | メールアドレス | △（条件付き） |
| show_email_in_directory | boolean | メールアドレスの名簿掲載可否 | - |
| mobile_phone | string | 携帯番号 | △（条件付き） |
| show_mobile_in_directory | boolean | 携帯番号の名簿掲載可否 | - |
| **自宅情報（名簿非公開）** | | | |
| home_postal_code | string | 自宅住所（郵便番号） | × |
| home_address | string | 自宅住所（番地まで） | × |
| home_phone | string | 自宅電話番号 | × |
| home_fax | string | 自宅FAX番号 | × |
| **その他** | | | |
| hobbies | text | 趣味・信条 | - |
| referrer_1 | string | 紹介者名1（必須） | - |
| referrer_2 | string | 紹介者名2（必須） | - |
| line_user_id | string | LINE UID（連携時） | - |
| profile_image | file | プロフィール画像 | ○ |
| rejection_reason | text | 却下理由（申込却下時） | - |
| role | enum | admin / member | - |
| notes | text | 備考（管理者用） | - |

#### 名簿表示ルール
- 基本表示: 氏名、委員会名（OrgAssignmentsから取得）、団体役職（OrgAssignmentsから取得）、生年月日、入会年
- 条件付き表示: メールアドレス（show_email_in_directory = true の場合）、会社情報（show_company_in_directory = true の場合）、携帯番号（show_mobile_in_directory = true の場合）
- 非公開: 自宅情報は常に非公開（名簿には一切表示しない）

### 2. FiscalYears（年度）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| year | number | 年度（例: 2025） |
| start_date | date | 年度開始日 |
| end_date | date | 年度終了日 |
| is_current | boolean | 現在の年度フラグ |

### 3. Organizations（組織・委員会）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| fiscal_year_id | relation | FiscalYearsへの参照 |
| org_name | string | 組織名（例: 総務委員会） |
| org_type | enum | 理事会 / 委員会 / 部会 / その他 |
| parent_id | relation | 親組織（階層構造用） |
| sort_order | number | 表示順 |

### 4. OrgAssignments（組織配属）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| fiscal_year_id | relation | FiscalYearsへの参照 |
| organization_id | relation | Organizationsへの参照 |
| member_id | relation | Membersへの参照 |
| role | string | 役職名（自由入力。例: 会長、副会長、委員長、副委員長、幹事、委員等） |

※ 名簿の「委員会名」「団体の役職」はこのコレクションから取得

### 5. Dues（会費）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| fiscal_year_id | relation | FiscalYearsへの参照 |
| member_id | relation | Membersへの参照 |
| amount | number | 会費金額 |
| status | enum | 未納 / 納入済 |
| paid_date | date | 入金日 |
| notes | text | 備考 |

### 6. Newsletters（メルマガ・LINE配信）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| subject | string | 件名 |
| body | text | 本文（プレーンテキスト） |
| body_html | richtext | 本文（HTML版、実装は後） |
| attachments | file[] | 添付ファイル（複数可） |
| target_segment | enum | 全員 / 正会員のみ / 賛助会員のみ / カスタム |
| send_channel | enum | Resend / LINE / 両方 |
| status | enum | 下書き / 予約中 / 送信済 |
| scheduled_at | datetime | 予約送信日時（Resend send_at利用） |
| sent_at | datetime | 実際の送信日時 |
| sent_by | string | 送信者名 |

### 7. DueSettings（会費金額設定）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| fiscal_year_id | relation | FiscalYearsへの参照 |
| member_type | enum | 正会員 / 賛助会員 |
| amount | number | 年会費金額 |

※ OB会員・休会中は会費対象外とする

### 8. OrgDocuments（団体資料）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| fiscal_year_id | relation | FiscalYearsへの参照（運用マニュアル等はnull可） |
| doc_type | enum | 事業計画 / 団体理念 / 会則・規約 / 年間スケジュール / 運用マニュアル |
| title | string | タイトル |
| content | richtext | 本文 |
| attachment | file | 添付ファイル（PDF等） |
| category | string | カテゴリ（運用マニュアル用。例: 例会ルール、委員会運営等） |
| published | boolean | 公開フラグ |
| sort_order | number | 表示順 |
| updated_at | datetime | 最終更新日時 |

### 9. MemberChangeLogs（会員情報変更ログ）
| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | auto | Base44自動ID |
| member_id | relation | Membersへの参照 |
| changed_by | string | 変更者（会員本人 or 管理者名） |
| changed_by_role | enum | member / admin |
| changed_at | datetime | 変更日時 |
| field_name | string | 変更されたフィールド名 |
| old_value | text | 変更前の値 |
| new_value | text | 変更後の値 |

## 年度切替時の運用

※ Membersコレクションは年度に依存しない。年度切替時に会員の基本情報（氏名、会社情報、連絡先等）はすべてそのまま引き継がれる。年度ごとに変わるのは以下のみ：
- OrgAssignments（組織配属・役職）
- Dues（会費）
- OrgDocuments（事業計画・年間スケジュール等の年度別資料）

1. 新年度のFiscalYearsレコードを作成
2. Organizationsを新年度用にコピー（または新規作成）
3. OrgAssignmentsを新年度用に登録
4. Duesを新年度用に一括生成
5. 前年度のis_new = true の会員をfalseにリセット
6. 前年度のis_currentをfalseに、新年度をtrueに切替

### Dues一括生成ルール
- 金額はDueSettingsの当年度×会員種別で自動決定
- 対象: status=「活動中」の正会員・賛助会員のみ
- 休会・退会ステータスの会員はDues一括生成の対象外とする

## リレーション図
