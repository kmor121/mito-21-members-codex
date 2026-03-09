# コレクション定義 — Base44投入ガイド

## 作成順序

リレーション依存関係に基づき、以下の順序で作成する。
参照先コレクションを先に作成しないと、Relation型フィールドを設定できない。

```
1. FiscalYears    ← 他コレクションから最も参照される
2. Members        ← OrgAssignments, Dues, MemberChangeLogs から参照される
3. Organizations  ← OrgAssignments から参照される（FiscalYears参照）
4. OrgAssignments ← FiscalYears, Organizations, Members を参照
5. Dues           ← FiscalYears, Members を参照
6. DueSettings    ← FiscalYears を参照
7. Newsletters    ← 独立（他コレクションへのRelationなし）
8. OrgDocuments   ← FiscalYears を参照（null可）
9. MemberChangeLogs ← Members を参照
```

---

## 1. FiscalYears（年度）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| year | Number | ○ | 年度（例: 2025） |
| start_date | Date | ○ | 年度開始日 |
| end_date | Date | ○ | 年度終了日 |
| is_current | Boolean | ○ | 現在の年度フラグ |

---

## 2. Members（会員）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| member_number | Text | | 会員番号（承認時に自動採番） |
| name_kanji | Text | ○ | 氏名（漢字） |
| name_kana | Text | ○ | 氏名（ふりがな） |
| birthday | Date | ○ | 生年月日 |
| join_date | Date | | 入会日（承認時に設定） |
| member_type | Enum | | 正会員 / 賛助会員 / OB会員 |
| status | Enum | | 活動中 / 休会 / 退会 |
| approval_status | Enum | ○ | 申請中 / 承認済 / 却下 |
| applied_at | Date | | 申込日時 |
| is_new | Boolean | | 新入会員フラグ（当年度入会） |
| company_name | Text | | 会社名 |
| company_position | Text | | 役職名 |
| industry | Text | | 業種 |
| company_postal_code | Text | | 会社住所（郵便番号） |
| company_address | Text | | 会社住所（番地まで） |
| company_phone | Text | | 会社電話番号 |
| company_fax | Text | | 会社FAX番号 |
| company_pr | Long Text | | 会社の概要・PR |
| show_company_in_directory | Boolean | | 会社情報の名簿掲載可否 |
| email | Text | ○ | メールアドレス |
| show_email_in_directory | Boolean | | メールアドレスの名簿掲載可否 |
| mobile_phone | Text | ○ | 携帯番号 |
| show_mobile_in_directory | Boolean | | 携帯番号の名簿掲載可否 |
| home_postal_code | Text | | 自宅住所（郵便番号） |
| home_address | Text | | 自宅住所（番地まで） |
| home_phone | Text | | 自宅電話番号 |
| home_fax | Text | | 自宅FAX番号 |
| hobbies | Long Text | | 趣味・信条 |
| referrer_1 | Text | ○ | 紹介者名1 |
| referrer_2 | Text | ○ | 紹介者名2 |
| line_user_id | Text | | LINE UID（連携時） |
| profile_image | File | | プロフィール画像 |
| rejection_reason | Long Text | | 却下理由（申込却下時） |
| role | Enum | | admin / member |
| notes | Long Text | | 備考（管理者用） |

---

## 3. Organizations（組織・委員会）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| fiscal_year_id | Relation → FiscalYears | ○ | 年度への参照 |
| org_name | Text | ○ | 組織名（例: 総務委員会） |
| org_type | Enum | ○ | 理事会 / 委員会 / 部会 / その他 |
| parent_id | Relation → Organizations | | 親組織（階層構造用） |
| sort_order | Number | | 表示順 |

---

## 4. OrgAssignments（組織配属）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| fiscal_year_id | Relation → FiscalYears | ○ | 年度への参照 |
| organization_id | Relation → Organizations | ○ | 組織への参照 |
| member_id | Relation → Members | ○ | 会員への参照 |
| role | Text | | 役職名（自由入力。例: 会長、副会長、委員長等） |

---

## 5. Dues（会費）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| fiscal_year_id | Relation → FiscalYears | ○ | 年度への参照 |
| member_id | Relation → Members | ○ | 会員への参照 |
| amount | Number | ○ | 会費金額 |
| status | Enum | ○ | 未納 / 納入済 |
| paid_date | Date | | 入金日 |
| notes | Long Text | | 備考 |

---

## 6. DueSettings（会費金額設定）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| fiscal_year_id | Relation → FiscalYears | ○ | 年度への参照 |
| member_type | Enum | ○ | 正会員 / 賛助会員 |
| amount | Number | ○ | 年会費金額 |

※ OB会員・休会中は会費対象外のため、Enumに含めない

---

## 7. Newsletters（メルマガ・LINE配信）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| subject | Text | ○ | 件名 |
| body | Long Text | ○ | 本文（プレーンテキスト） |
| body_html | Rich Text | | 本文（HTML版、実装は後フェーズ） |
| attachments | File | | 添付ファイル（複数可） |
| target_segment | Enum | ○ | 全員 / 正会員のみ / 賛助会員のみ / カスタム |
| send_channel | Enum | ○ | Resend / LINE / 両方 |
| status | Enum | ○ | 下書き / 予約中 / 送信済 |
| scheduled_at | Date | | 予約送信日時（Resend send_at利用） |
| sent_at | Date | | 実際の送信日時 |
| sent_by | Text | | 送信者名 |

---

## 8. OrgDocuments（団体資料）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| fiscal_year_id | Relation → FiscalYears | | 年度への参照（運用マニュアル等はnull可） |
| doc_type | Enum | ○ | 事業計画 / 団体理念 / 会則・規約 / 年間スケジュール / 運用マニュアル |
| title | Text | ○ | タイトル |
| content | Rich Text | | 本文 |
| attachment | File | | 添付ファイル（PDF等） |
| category | Text | | カテゴリ（運用マニュアル用。例: 例会ルール） |
| published | Boolean | ○ | 公開フラグ |
| sort_order | Number | | 表示順 |
| updated_at | Date | | 最終更新日時 |

---

## 9. MemberChangeLogs（会員情報変更ログ）

| フィールド名 | Base44型 | 必須 | 説明 |
|-------------|---------|------|------|
| member_id | Relation → Members | ○ | 会員への参照 |
| changed_by | Text | ○ | 変更者（会員本人 or 管理者名） |
| changed_by_role | Enum | ○ | member / admin |
| changed_at | Date | ○ | 変更日時 |
| field_name | Text | ○ | 変更されたフィールド名 |
| old_value | Long Text | | 変更前の値 |
| new_value | Long Text | | 変更後の値 |

---

## 備考

- **作成順序の理由**: Relation型フィールドは参照先コレクションが存在しないと設定できないため、被参照コレクション（FiscalYears, Members）を先に作成する。
- **Enum値は日本語で設定**: Base44のEnum値は表示名がそのまま値になるため、日本語（正会員、賛助会員等）で設定する。ただし `role`（admin/member）と `changed_by_role`（member/admin）は英語で設定。
- **id フィールド**: Base44が自動生成するため、手動での定義は不要。
- **Boolean のデフォルト値**: `is_current`, `is_new`, `show_*_in_directory`, `published` 等は必要に応じてデフォルト値を `false` に設定。
- **File型の複数添付**: Base44のFile型が複数ファイル対応かどうかは実装時に確認。非対応の場合、Newslettersの添付は1ファイルに制限するか、別コレクションで管理。
