# ワークフロー設計

## 1. 入会申込〜承認フロー

```
[申込者] P1: 入会申込フォーム入力・送信
    │
    ▼
[システム] Membersコレクションに保存
           ├── approval_status = 「申請中」
           ├── applied_at = 現在日時
           └── status = 未設定（承認後に設定）
    │
    ▼
[バックエンド] sendApplicationNotification
           ├── 管理者宛: 「新規入会申込あり」通知メール（Resend API）
           └── 申込者宛: 「受付完了」メール（Resend API）
    │
    ▼
[申込者] P2: 申込完了画面表示
    │
    ▼
[管理者] A4: 入会申込管理で申込内容を確認
           └── 紹介者名で既存会員を照合
    │
    ├── 【承認の場合】
    │   ├── member_type を選択（正会員 / 賛助会員）
    │   ├── member_number を自動採番
    │   ├── approval_status = 「承認済」
    │   ├── status = 「活動中」
    │   ├── is_new = true
    │   ├── join_date = 現在日
    │   └── [バックエンド] sendApprovalEmail → ウェルカムメール送信
    │
    └── 【却下の場合】
        ├── rejection_reason を入力
        ├── approval_status = 「却下」
        └── [バックエンド] sendApprovalEmail → 却下通知メール送信
```

## 2. 年度切替フロー

```
[管理者] A8: 年度管理
    │
    ├── Step 1: 新年度のFiscalYearsレコードを作成
    │   └── year, start_date, end_date を入力
    │
    ├── Step 2: DueSettingsを設定
    │   └── 新年度 × 会員種別（正会員/賛助会員）ごとの年会費金額を入力
    │
    ▼
[管理者] 年度切替実行ボタン（確認ダイアログ付き）
    │
    ▼
[バックエンド] executeFiscalYearTransition
    │
    ├── Step 3: Organizationsの新年度コピー（任意）
    │   └── 前年度の組織構成をコピーして新年度用に複製
    │
    ├── Step 4: OrgAssignmentsの登録（手動 or コピー後に編集）
    │
    ├── Step 5: Duesを一括生成
    │   ├── 対象: status=「活動中」の正会員・賛助会員
    │   ├── 金額: DueSettingsの当年度×会員種別で自動決定
    │   ├── status = 「未納」
    │   └── 休会・退会会員は対象外
    │
    ├── Step 6: is_newフラグのリセット
    │   └── 前年度のis_new = true → false に更新
    │
    └── Step 7: is_currentフラグの切替
        ├── 前年度: is_current = false
        └── 新年度: is_current = true
```

## 3. メルマガ配信フロー

```
[管理者] A7: 配信管理 → 新規作成
    │
    ├── 件名・本文（プレーンテキスト）を入力
    ├── 添付ファイルをアップロード（任意）
    ├── 配信チャネルを選択（Resend / LINE / 両方）
    ├── セグメントを選択（全員 / 正会員のみ / 賛助会員のみ / カスタム）
    └── Newslettersコレクションに保存（status = 「下書き」）
    │
    ▼
[管理者] プレビュー確認
    └── 対象者数・内容を確認
    │
    ├── 【即時送信の場合】
    │   ├── [バックエンド] sendNewsletter
    │   │   ├── セグメント条件で対象会員のメールアドレスを取得
    │   │   └── Resend API（POST /emails）で送信
    │   ├── sent_at = 現在日時
    │   └── status = 「送信済」
    │
    └── 【予約送信の場合】
        ├── scheduled_at に送信日時を設定
        ├── [バックエンド] sendNewsletter
        │   └── Resend API（POST /emails, send_at パラメータ付き）
        ├── status = 「予約中」
        └── 送信完了後: status = 「送信済」、sent_at = 実際の送信日時
```

## 4. 会員プロフィール更新フロー

```
[会員] M3: マイページ
    │
    ├── 編集可能項目を変更
    │   ├── 個人連絡先: メールアドレス、携帯番号
    │   ├── 会社情報: 会社名、役職名、業種、住所、電話、FAX、PR
    │   ├── 自宅情報: 住所、電話、FAX
    │   ├── その他: 趣味・信条、名簿掲載設定
    │   ├── 顔写真: プロフィール画像のアップロード・変更
    │   └── LINE連携: 紐づけ/解除（後フェーズ）
    │
    ├── 編集不可（管理者のみ変更可能）
    │   └── 氏名、フリガナ、生年月日、会員種別、ステータス、会員番号
    │
    ▼
[会員] 保存ボタンクリック
    │
    ├── Membersコレクションを即時更新（管理者承認不要）
    │
    └── MemberChangeLogsに変更履歴を自動記録
        ├── member_id: 対象会員
        ├── changed_by: 会員本人の名前
        ├── changed_by_role: member
        ├── changed_at: 現在日時
        ├── field_name: 変更されたフィールド名
        ├── old_value: 変更前の値
        └── new_value: 変更後の値
    │
    ▼
[管理者] A3: 会員詳細・編集 → 変更履歴タブ
    └── MemberChangeLogsの一覧で変更内容を確認可能
```
