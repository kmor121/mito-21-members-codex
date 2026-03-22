---
name: ui-ux-guidelines
description: mito-21-members-codexのUI/UX実装ルール。デザイントークン・共通コンポーネント・ページテンプレートの使い方を定義。新規画面作成・既存画面修正時に必ず参照する。
trigger: UI作成、画面修正、コンポーネント作成、スタイル変更時
---

# UI/UX 実装ガイドライン

## 絶対ルール

1. **色はデザイントークン（CSS変数）で指定** — ハードコード禁止（バッジのセマンティック色のみ例外）
2. **共通Reactコンポーネントを使う** — Button, Card, PageHeader, Modal を import して使う
3. **Tailwind CSS は使わない** — CSS変数 + 独自クラスのみ
4. **window.confirm/alert/prompt 禁止** — カスタムModal を使う
5. **通知は showToast()** — `if (window.__showToast) window.__showToast('メッセージ', 'success')`
6. **タブはフラットアンダーライン型のみ** — pill型タブ（青塗りつぶし丸型）は禁止
7. **色のハードコード禁止** — 全ファイルでtokens.cssのCSS変数に移行済み。残存するのはバッジ固有色と白テキスト(#fff)のみ

---

## デザイントークン（src/styles/tokens.css）

### カラー
| 変数 | 値 | 用途 |
|------|------|------|
| `--color-accent` | `#2563eb` | メインカラー、ボタン、リンク |
| `--color-accent-light` | `#eff6ff` | 薄い背景（選択状態等） |
| `--color-accent-dark` | `#1d4ed8` | ホバー時 |
| `--color-text-primary` | `#111827` | 本文テキスト |
| `--color-text-secondary` | `#6b7280` | 補助テキスト |
| `--color-text-tertiary` | `#9ca3af` | 薄いテキスト、非アクティブタブ |
| `--color-border` | `#e5e7eb` | ボーダー・区切り線 |
| `--color-bg` | `#ffffff` | カード・パネル背景 |
| `--color-bg-sub` | `#f9fafb` | ページ背景・入力フィールド背景 |
| `--color-success` / `-light` | `#16a34a` / `#f0fdf4` | 成功、完了、活動中 |
| `--color-danger` / `-light` | `#dc2626` / `#fef2f2` | エラー、削除、退会 |
| `--color-warning` / `-light` | `#d97706` / `#fffbeb` | 警告、休会 |

### タイポグラフィ
| 変数 | 値 |
|------|------|
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

### スペーシング・角丸・シャドウ・トランジション
| 変数 | 値 | 用途 |
|------|------|------|
| `--space-1` 〜 `--space-8` | `4px` 〜 `32px` | |
| `--radius-sm` / `md` / `lg` / `xl` / `full` | `6px` 〜 `9999px` | バッジ / 入力 / カード / モーダル / ピル |
| `--shadow-sm` / `md` / `hover` | | カード / ホバー効果 |
| `--transition-fast` | `0.12s ease` | |

---

## 共通Reactコンポーネント（src/components/ui/）

### Button
```jsx
<Button variant="primary" onClick={...}>メインアクション</Button>
<Button variant="secondary" onClick={...}>補助</Button>
<Button variant="danger" onClick={...}>危険</Button>
<Button variant="ghost" onClick={...}>ゴースト</Button>
<Button variant="primary" size="sm">小</Button>
```

### PageHeader
```jsx
<PageHeader title="ページ名" subtitle="説明文" />
<PageHeader title="ページ名" actions={<Button variant="primary">新規作成</Button>} />
```

### Card
```jsx
<Card>コンテンツ</Card>
<Card padding="14px 16px">統計カード</Card>
<Card padding="0" style={{ overflow: 'hidden' }}>リスト形式</Card>
<Card onClick={() => navigate(...)}>クリック可能</Card>
```

### Modal
```jsx
<Modal isOpen={show} onClose={() => setShow(false)} title="タイトル" width="480px"
  footer={<><Button variant="secondary" onClick={...}>キャンセル</Button><Button variant="primary" onClick={...}>実行</Button></>}
>内容</Modal>
```
- モバイル時は自動フルスクリーン。Escape / オーバーレイクリックで閉じる。bodyスクロールロック付き。

### その他
| コンポーネント | 用途 |
|---|---|
| `YearPillNav` | 年度切替ドロップダウン（タイトル行に統合配置） |
| `DatePicker` / `DateTimePicker` | 日付選択 |
| `TimeSelect` | 時刻選択 |
| `MemberSelector` | 会員検索ドロップダウン |
| `Skeleton` / `SkeletonCard` | ローディングUI |
| `AttendanceDeadlineBadge` | 出欠回答期限バッジ |

---

## UIパターン

### 1. タブ — フラットアンダーライン型（全ページ統一）

**pill型（青塗りつぶし丸型）は禁止。** CSSクラス（`nl2-pill-tab`）もインラインスタイルも全てフラットアンダーライン型に統一済み。

#### インラインスタイル実装（推奨）
```jsx
<div style={{
  display: 'flex', borderBottom: '1px solid var(--color-border)',
  overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
  marginBottom: 'var(--space-4)',
}}>
  {tabs.map(tab => {
    const isActive = activeTab === tab.key;
    return (
      <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
        style={{
          padding: '8px 14px', fontSize: 14, whiteSpace: 'nowrap', cursor: 'pointer',
          background: 'none', border: 'none', borderRadius: 0,
          borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
          color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
          fontWeight: isActive ? 'var(--font-weight-semibold)' : 'var(--font-weight-medium)',
          transition: 'color var(--transition-fast), border-color var(--transition-fast)',
        }}
      >{tab.label}</button>
    );
  })}
</div>
```

#### CSSクラス実装（既存ページ）
- `nl2-pill-tab` / `nl2-pill-tabs` — index.css でフラットアンダーライン型に定義済み
- `tab-bar` / `tab-button` — 同上

#### 件数バッジ付きタブ
```jsx
<button ...>
  {tab.label}
  <span style={{
    fontSize: 11, fontWeight: 600, borderRadius: 'var(--radius-full)', padding: '1px 6px',
    background: isActive ? 'var(--color-accent)' : 'var(--color-bg-sub)',
    color: isActive ? '#fff' : 'var(--color-text-tertiary)',
  }}>{count}</span>
</button>
```
- 独立行の「XX件」テキストは禁止。件数はタブ横のバッジに統合する。

### 2. YearPillNav — タイトル行に統合

YearPillNavは独立行にせず、PageHeaderのタイトル横に統合配置する:
```jsx
{isMobile ? (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
    <h1 style={{ margin: 0, fontSize: 18, fontWeight: 'var(--font-weight-bold)' }}>ページ名</h1>
    <YearPillNav ... />
  </div>
) : (
  <PageHeader title="ページ名" subtitle="説明文"
    actions={<><YearPillNav ... /><Button variant="primary">新規作成</Button></>} />
)}
```

### 3. プロフィール表示 — コンパクト横並び

参考: MyPage.jsx, MemberProfile.jsx
```jsx
<Card padding="var(--space-4)">
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    {/* 48pxアバター */}
    <div style={{
      width: 48, height: 48, borderRadius: 'var(--radius-full)', flexShrink: 0,
      border: '2px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg-sub)', color: 'var(--color-text-secondary)',
      fontSize: 18, fontWeight: 'var(--font-weight-semibold)',
    }}>{initial}</div>
    <div>
      <div style={{ fontSize: 18, fontWeight: 'var(--font-weight-bold)' }}>{name}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
        <span style={{ fontSize: 12, padding: '1px 8px', borderRadius: 'var(--radius-full)',
          background: 'var(--color-accent-light)', color: 'var(--color-accent)', fontWeight: 600 }}>
          {memberType}
        </span>
        {orgText}
      </div>
    </div>
  </div>
</Card>
```

### 4. フィールド一覧 — InfoRowリスト形式

個別カードで各フィールドを囲むのは禁止。1つのCardの中にラベル+値のリストを表示する:

参考: MyPage.jsx, MemberProfile.jsx
```jsx
function InfoRow({ label, value, isMobile, isLast }) {
  const isEmpty = !value && value !== 0;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: isMobile ? '100px 1fr' : '120px 1fr',
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>{label}</span>
      {isEmpty
        ? <span style={{ fontSize: 14, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>未設定</span>
        : <span style={{ fontSize: 14, color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-medium)' }}>{String(value)}</span>
      }
    </div>
  );
}

// 使い方:
<Card padding="0" style={{ overflow: 'hidden' }}>
  {rows.map((row, idx) => (
    <InfoRow key={row.label} label={row.label} value={row.value} isMobile={isMobile} isLast={idx === rows.length - 1} />
  ))}
</Card>
```

### 5. 保存バナー — フローティングバー

ドラッグ&ドロップ等で未保存の変更がある場合、画面下部に固定バーをスライドイン表示する:

参考: OrgChart.jsx, Documents.jsx
```jsx
<div style={{
  position: 'fixed', bottom: 0, left: 0, right: 0,
  background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)',
  boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
  padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 12, zIndex: 100,
  transform: hasChanges ? 'translateY(0)' : 'translateY(100%)',
  transition: 'transform 0.25s ease',
}}>
  <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>並び順が変更されました</span>
  <div style={{ display: 'flex', gap: 8 }}>
    <Button variant="secondary" onClick={handleCancel}>キャンセル</Button>
    <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
  </div>
</div>
```

---

## ページテンプレート

### 管理画面
```jsx
import { PageHeader, Button, Card, Modal } from '../../components/ui';
import YearPillNav from '../../components/ui/YearPillNav';

export default function SomePage() {
  return (
    <section className="admin-shell">
      <PageHeader title="ページ名" subtitle="説明文"
        actions={<><YearPillNav .../><Button variant="primary">新規作成</Button></>} />

      {/* フラットタブ */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-4)' }}>
        {tabs.map(tab => <button ...>{tab.label}<span className="count-badge">...</span></button>)}
      </div>

      {/* コンテンツ */}
      <Card>...</Card>
    </section>
  );
}
```

---

## フォーム入力フィールド

ページ固有のscoped styleで定義（例: evt-input, mtg-input）:
```css
.xxx-label { display: block; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 6px; }
.xxx-input {
  width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-bg-sub); font-size: 14px; color: var(--color-text-primary);
  outline: none; transition: border-color 0.15s, background 0.15s;
}
.xxx-input:focus { border-color: var(--color-accent); background: var(--color-bg); }
```

モバイル対応（iOS自動ズーム防止）:
```css
@media (max-width: 768px) {
  .xxx-input { font-size: 16px !important; padding: 12px 14px !important; }
}
```

---

## モバイル対応

- **タイトル**: PC 20px / モバイル 18px（PageHeaderが自動対応）
- **モーダル**: モバイルで自動フルスクリーン
- **入力フィールド**: モバイルで font-size: 16px（iOS自動ズーム防止）
- **テーブル**: `overflow-x: auto` でスクロール可能に
- **タブ**: `overflowX: auto, scrollbarWidth: none` で横スクロール可能
- **YearPillNav**: タイトル行に統合、ドロップダウン展開

---

## やってはいけないこと

1. **旧カラー変数を使う** — `var(--primary)`, `var(--text)`, `var(--line)` 等は禁止
2. **旧パターンを使う** — `btn btn-primary` → `<Button variant="primary">`、`confirm-overlay` → `<Modal>`
3. **Tailwind クラスを使う** — `bg-blue-600`, `text-sm` 等は禁止
4. **色をハードコードする** — `#4f46e5` ではなく `var(--color-accent)`
5. **新しいCSSファイルを作る** — `src/styles/index.css` かページ固有 `<style>` で
6. **window.confirm/alert/prompt を使う** — Modal を使う
7. **pill型タブを作る** — 丸い背景付きタブは全て禁止。フラットアンダーライン型のみ
8. **独立行の件数表示** — 「XX件」はタブ横バッジに統合
9. **フィールドを個別カードで囲む** — InfoRowリスト形式を使う
10. **YearPillNavを独立行に配置** — タイトル行に統合
