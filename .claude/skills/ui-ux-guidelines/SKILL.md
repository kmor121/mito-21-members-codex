---
name: ui-ux-guidelines
description: mito-21-members-codexプロジェクトのUI/UX実装ルール。CSS変数・共通クラス・共通コンポーネントの使い方を定義。新規画面作成・既存画面修正時に必ず参照する。
trigger: UI作成、画面修正、コンポーネント作成、スタイル変更時
---

# UI/UX 実装ガイドライン

## 絶対ルール

1. **Tailwind CSS は使わない** — このプロジェクトは CSS 変数 + 独自クラス。`bg-blue-600` 等の Tailwind クラスは禁止。
2. **色は CSS 変数で指定** — `#4f46e5` ではなく `var(--primary)` を使う。ハードコードした色値は原則禁止。
3. **共通 CSS クラスを優先** — ボタンは `btn btn-primary`、モーダルは `confirm-overlay` + `modal-dialog`。独自スタイルの再発明をしない。
4. **共通コンポーネントを使う** — DatePicker, TimeSelect, MemberSelector, YearPillNav 等は既存を import する。
5. **管理画面のレイアウトは `admin-shell` + `page-header` + `page-title`** — 全管理画面で統一。

---

## カラーパレット（CSS 変数）

すべて `src/styles/index.css` の `:root` で定義。

### ブランド / プライマリ
| 変数 | 値 | 用途 |
|------|------|------|
| `--primary` | `#4f46e5` | メインカラー、ボタン、リンク |
| `--primary-hover` | `#4338ca` | ホバー時 |
| `--primary-light` | `#eef2ff` | 薄い背景（選択状態等） |
| `--primary-50` | `#eef2ff` | = primary-light |
| `--primary-100` | `#e0e7ff` | ボーダー薄色 |
| `--primary-600` | `#4f46e5` | = primary |
| `--primary-700` | `#4338ca` | = primary-hover |
| `--primary-800` | `#3730a3` | 濃い primary |

### ステータス
| 変数 | 値 | 用途 |
|------|------|------|
| `--success` | `#059669` | 成功、完了、活動中 |
| `--success-light` | `#ecfdf5` | 成功背景 |
| `--error` | `#dc2626` | エラー、削除、退会 |
| `--error-light` | `#fef2f2` | エラー背景 |
| `--warning` | `#d97706` | 警告、休会 |
| `--warning-light` | `#fffbeb` | 警告背景 |
| `--info` | `#2563eb` | 情報 |
| `--info-light` | `#eff6ff` | 情報背景 |

### ニュートラル
| 変数 | 値 | 用途 |
|------|------|------|
| `--bg` | `#f8fafc` | ページ背景 |
| `--panel` | `#ffffff` | カード・パネル背景 |
| `--text` | `#1e293b` | 本文テキスト |
| `--text-secondary` | `#64748b` | 補助テキスト |
| `--muted` | `#94a3b8` | 薄いテキスト |
| `--line` | `#e2e8f0` | ボーダー・区切り線 |
| `--line-light` | `#f1f5f9` | 薄い背景・テーブルヘッダ |

### シャドウ
| 変数 | 値 |
|------|------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04)` |
| `--shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)` |

### サイズ
| 変数 | 値 | 用途 |
|------|------|------|
| `--radius-sm` | `6px` | 小要素（バッジ等） |
| `--radius` | `8px` | 標準（入力、ボタン） |
| `--radius-lg` | `12px` | カード |
| `--radius-xl` | `16px` | 大型パネル |
| `--sidebar-width` | `240px` | サイドバー幅 |
| `--header-height` | `56px` | ヘッダー高さ |
| `--transition` | `0.15s ease` | 標準トランジション |

---

## 共通 CSS クラス

### レイアウト
| クラス | 用途 |
|--------|------|
| `admin-shell` | 管理画面のページコンテナ（`display: grid; gap: 20px`） |
| `page-header` | ページヘッダー領域（`margin-bottom: 24px`） |
| `page-title` | h1 タイトル（`font-size: 22px; font-weight: 700`） |
| `page-description` | サブタイトル（`font-size: 13px; color: var(--text-secondary)`） |
| `single-panel` | 単一カラム中央寄せ（`max-width: 1080px`） |
| `admin-grid` | 2カラム（`260-340px + 1fr; max-width: 1080px`） |

### ボタン
```html
<button class="btn btn-primary">主要アクション</button>
<button class="btn btn-secondary">補助アクション</button>
<button class="btn btn-danger">危険アクション</button>
```
- `btn`: 基本スタイル（`padding: 8px 16px; border-radius: var(--radius); font-size: 13px; font-weight: 600; gap: 6px; inline-flex`）
- `btn-primary`: primary 背景 + 白文字
- `btn-secondary`: 白背景 + ボーダー
- `btn-danger`: error 背景 + 白文字
- `btn:disabled`: `opacity: 0.5`
- テキストリンク: `text-link` クラス（`color: var(--primary); font-size: 13px; font-weight: 600`）

### カード
```html
<div class="card">
  <div class="card-header">見出し</div>
  <div class="card-body">内容</div>
</div>
<div class="panel-card single-panel">全幅パネル</div>
```
- `card`: 白背景、ボーダー、`border-radius: 12px`、shadow
- `panel-card`: 全幅カード

### テーブル
```html
<div class="table-wrap">
  <table class="data-table"><!-- or members-table -->
    <thead><tr><th>列名</th></tr></thead>
    <tbody><tr><td>値</td></tr></tbody>
  </table>
</div>
```
- `table-wrap`: `overflow-x: auto`
- `data-table` / `members-table`: `width: 100%; border-collapse: collapse`
- th: `padding: 10px 14px; font-size: 11px; font-weight: 700; background: var(--line-light); sticky top`
- td: `padding: 10px 14px; border-bottom: 1px solid var(--line)`
- hover: `background: var(--primary-light)`
- 偶数行: `background: #fafbfc`

### タブ
```html
<button class="nl2-pill-tab active">アクティブ</button>
<button class="nl2-pill-tab">非アクティブ</button>
```
- `nl2-pill-tab`: `padding: 5px 14px; border-radius: 999px; border: 1px solid var(--line)`
- `.active`: `background: var(--primary); color: #fff; border-color: var(--primary)`

### モーダル
```jsx
<div className="confirm-overlay" onClick={onClose}>
  <div className="modal-dialog" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
    {/* header */}
    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>タイトル</h3>
      <button className="btn btn-secondary" style={{ padding: '4px 8px' }}
        onClick={onClose}>&times;</button>
    </div>
    {/* body */}
    <div style={{ padding: '20px 24px' }}>内容</div>
    {/* footer */}
    <div style={{ padding: '12px 24px 16px', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
      <button className="btn btn-secondary" onClick={onClose}>キャンセル</button>
      <button className="btn btn-primary" onClick={onConfirm}>実行</button>
    </div>
  </div>
</div>
```
- `confirm-overlay`: 全画面オーバーレイ（`fixed; inset: 0; rgba(0,0,0,0.4); z-index: 1000`）
- `modal-dialog`: 白背景、`max-width: 800px; width: 92%; border-radius: var(--radius-lg); max-height: 90vh; overflow-y: auto`
- 確認ダイアログ専用の `confirm-dialog` クラスもある（`max-width: 420px` 固定）

### バッジ / ピル
```jsx
<span className="pill">デフォルト</span>
<span className="pill pill-success">成功</span>
<span className="pill pill-warning">警告</span>
<span className="pill pill-danger">エラー</span>
```
- `pill`: `padding: 2px 10px; border-radius: 6px; font-size: 12px`

ステータスバッジのインライン実装パターン（多くのページで使用）:
```jsx
const STATUS_BADGE = {
  "活動中": { bg: "#ecfdf5", color: "#059669" },
  "休会":   { bg: "#fffbeb", color: "#d97706" },
};
<span style={{ background: badge.bg, color: badge.color, padding: '3px 10px',
  borderRadius: 999, fontSize: 11, fontWeight: 600 }}>{status}</span>
```

### トースト
```javascript
// グローバル関数（App.jsx で window.__showToast を公開）
if (window.__showToast) window.__showToast('メッセージ', 'success');
// type: 'success' | 'error' | 'info'
```
- ページ内ローカルトーストは `nl2-toast` クラス:
```jsx
{toast && <div className="nl2-toast"><span className="nl2-toast-icon">{"\u2713"}</span><span>{toast}</span></div>}
```

### フォーム入力
- グローバルスタイル: `input, select, textarea` に `padding: 9px 12px; border: 1px solid var(--line); border-radius: var(--radius); font-size: 14px`
- focus: `border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,0.12)`
- ラベル: `font-size: 13px; font-weight: 600; color: #374151`
- 必須マーク: `<span style={{ color: 'var(--error)' }}>*</span>`
- ページ固有入力クラス（例: `mtg-input`, `nl2-subject-input`）は各ページの scoped `<style>` で定義

---

## 共通 React コンポーネント

### UI コンポーネント（`src/components/ui/`）

| コンポーネント | Props | 用途 |
|---------------|-------|------|
| `DatePicker` | `value, onChange, placeholder, disabled, required, minYear, maxYear` | 日付選択（YYYY-MM-DD） |
| `TimeSelect` | `value, onChange, disabled, placeholder` | 時刻選択（HH:mm）、クイックボタン付き |
| `MemberSelector` | `value, onChange, members, roleMap, disabled, placeholder` | 会員検索ドロップダウン |
| `YearPillNav` | `fiscalYears, activeFyId, currentFyId, onChange` | 年度切替ピルナビ |
| `Skeleton` | 各種（`SkeletonText`, `MemberListSkeleton` 等） | ローディングプレースホルダ |

### Common コンポーネント（`src/components/common/`）

| コンポーネント | Props | 用途 |
|---------------|-------|------|
| `LoadingSpinner` | `message` | ローディング表示 |
| `EmptyState` | `message` | データなし表示 |
| `ErrorBoundary` | `children` | エラーキャッチ |
| `ConfirmDialog` | `open, title, message, confirmLabel, cancelLabel, confirmStyle, onConfirm, onCancel` | 確認ダイアログ |
| `RichTextEditor` | `content, onChange, placeholder` | TipTap リッチテキスト |
| `ToastContainer` | `toasts` | トースト描画（App.jsx で使用） |

### ユーティリティ（`src/utils/formatName.js`）
- `fullName(member)` — 「姓 名」
- `nameInitial(member)` — 姓の頭文字（アバター用）
- `greetingName(member)` — 「姓さん」

---

## ページ構造テンプレート（管理画面）

```jsx
export default function SomePage() {
  return (
    <section className="admin-shell">
      {/* ページヘッダー */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">ページ名</h1>
          <p className="page-description">説明文</p>
        </div>
        <button className="btn btn-primary" onClick={...}>
          <svg>...</svg> アクション
        </button>
      </div>

      {/* 年度切替（必要な場合） */}
      <YearPillNav fiscalYears={...} activeFyId={...} currentFyId={...} onChange={...} />

      {/* コンテンツ（カード / テーブル / リスト） */}
      <div className="panel-card single-panel">
        <div className="table-wrap">
          <table className="data-table">...</table>
        </div>
      </div>

      {/* モーダル */}
      {showModal && (
        <div className="confirm-overlay" onClick={close}>
          <div className="modal-dialog" onClick={e => e.stopPropagation()}>
            ...
          </div>
        </div>
      )}

      {/* ページ固有スタイル（必要な場合のみ） */}
      <style>{`
        .page-specific-class { ... }
        @media (max-width: 768px) { ... }
      `}</style>
    </section>
  );
}
```

---

## モバイル対応

- **ブレークポイント**: `1080px`（サイドバー折りたたみ）、`768px`（レイアウト変更）、`640px`（フルモバイル）
- **手法**: CSS `@media` クエリ。ページ固有はスコープ付き `<style>` 内に記述。
- **パターン**:
  - 2カラム grid → 1カラム: `grid-template-columns: 1fr !important`
  - padding 縮小: `24px → 16px`
  - モーダル: `max-width: 92%`（デフォルトで対応済み）
  - 非表示にしたい要素: `display: none` を media query で指定
- **AdminLayout / MemberLayout** が自動でサイドバー折りたたみ・ハンバーガーメニュー・モバイルナビを処理。

---

## やってはいけないこと

1. **Tailwind クラスを使う** — `bg-blue-600`, `text-sm`, `flex`, `p-4` 等は禁止。CSS 変数とプロジェクト固有クラスを使う。
2. **色を直書きする** — `#4f46e5` ではなく `var(--primary)`。ステータス色も `var(--success)` 等を使う。
3. **共通クラスを再実装する** — ボタンに独自 padding/border-radius を当てず `btn btn-primary` を使う。
4. **新しい CSS ファイルを作る** — 全スタイルは `src/styles/index.css` に集約。ページ固有はスコープ付き `<style>` で。
5. **SmartHR / freee / 外部デザインシステムの概念を持ち込む** — このプロジェクト固有のクラスと変数だけを使う。
