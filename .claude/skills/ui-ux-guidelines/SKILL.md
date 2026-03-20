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
| `--color-text-tertiary` | `#9ca3af` | 薄いテキスト |
| `--color-border` | `#e5e7eb` | ボーダー・区切り線 |
| `--color-bg` | `#ffffff` | カード・パネル背景 |
| `--color-bg-sub` | `#f9fafb` | ページ背景・入力フィールド背景 |
| `--color-success` | `#16a34a` | 成功、完了、活動中 |
| `--color-success-light` | `#f0fdf4` | 成功背景 |
| `--color-danger` | `#dc2626` | エラー、削除、退会 |
| `--color-danger-light` | `#fef2f2` | エラー背景 |
| `--color-warning` | `#d97706` | 警告、休会 |
| `--color-warning-light` | `#fffbeb` | 警告背景 |

### タイポグラフィ
| 変数 | 値 |
|------|------|
| `--font-family` | `-apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif` |
| `--font-weight-normal` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |

### スペーシング
| 変数 | 値 |
|------|------|
| `--space-1` 〜 `--space-8` | `4px` 〜 `32px` |

### 角丸
| 変数 | 値 | 用途 |
|------|------|------|
| `--radius-sm` | `6px` | バッジ等 |
| `--radius-md` | `8px` | 標準（入力、ボタン） |
| `--radius-lg` | `12px` | カード |
| `--radius-xl` | `14px` | モーダル |
| `--radius-full` | `9999px` | ピル |

### シャドウ
| 変数 | 値 |
|------|------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-md` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)` |
| `--shadow-hover` | `0 4px 12px rgba(0,0,0,0.08)` |

### トランジション
| 変数 | 値 |
|------|------|
| `--transition-fast` | `0.12s ease` |

---

## 共通Reactコンポーネント（src/components/ui/）

### Button
```jsx
import { Button } from '../../components/ui';

<Button variant="primary" onClick={...}>メインアクション</Button>
<Button variant="secondary" onClick={...}>補助アクション</Button>
<Button variant="danger" onClick={...}>危険アクション</Button>
<Button variant="ghost" onClick={...}>ゴースト</Button>
<Button variant="primary" size="sm">小</Button>
<Button variant="primary" size="lg">大</Button>
<Button variant="primary" disabled>無効</Button>
```

### PageHeader
```jsx
import { PageHeader } from '../../components/ui';

<PageHeader title="ページ名" subtitle="説明文" />
<PageHeader title="ページ名" actions={<Button variant="primary" onClick={...}>新規作成</Button>} />
```
- モバイル時はタイトル18px、PC時は20px（自動対応）

### Card
```jsx
import { Card } from '../../components/ui';

<Card>コンテンツ</Card>
<Card padding="14px 16px">統計カード</Card>
<Card onClick={() => navigate(...)}>クリック可能カード</Card>
<Card style={{ border: '1.5px solid var(--color-accent)' }}>ハイライト</Card>
```
- クリック可能な場合、ホバーで `translateY(-1px)` + shadow

### Modal
```jsx
import { Modal, Button } from '../../components/ui';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="タイトル"
  width="480px"
  footer={
    <>
      <Button variant="secondary" onClick={() => setShowModal(false)}>キャンセル</Button>
      <Button variant="primary" onClick={handleSubmit}>実行</Button>
    </>
  }
>
  <p>モーダルの内容</p>
</Modal>
```
- モバイル時は自動でフルスクリーン表示
- Escape キーとオーバーレイクリックで閉じる
- body スクロールロック付き
- Modal内に `<form>` タグは不要（footerのButtonで処理）

### その他UIコンポーネント
| コンポーネント | 用途 |
|---|---|
| `DatePicker` | 日付選択（YYYY-MM-DD） |
| `TimeSelect` | 時刻選択（HH:mm） |
| `MemberSelector` | 会員検索ドロップダウン |
| `YearPillNav` | 年度切替ピルナビ（セグメントコントロール風） |

---

## ページテンプレート

### 管理画面（デスクトップ）
```jsx
import { PageHeader, Button, Card, Modal } from '../../components/ui';

export default function SomePage() {
  return (
    <section className="admin-shell">
      <PageHeader
        title="ページ名"
        subtitle="説明文"
        actions={<Button variant="primary" onClick={...}>新規作成</Button>}
      />

      {/* 年度切替（必要な場合） */}
      <YearPillNav fiscalYears={...} activeFyId={...} currentFyId={...} onChange={...} />

      {/* 統計カード */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 24 }}>
        <Card padding="14px 16px">
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>ラベル</div>
          <div style={{ fontSize: 22, fontWeight: 600 }}>値</div>
        </Card>
      </div>

      {/* コンテンツ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Card onClick={() => navigate(...)}>カード内容</Card>
      </div>

      {/* モーダル */}
      <Modal isOpen={showModal} onClose={close} title="タイトル" footer={...}>
        内容
      </Modal>
    </section>
  );
}
```

### モバイルヘッダー（isMobile分岐が必要な場合）
```jsx
{isMobile ? (
  <div style={{ padding: '0 0 12px' }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
      <h1 className="page-title" style={{ margin: 0, fontSize: 18 }}>ページ名</h1>
      <button type="button" onClick={...} style={{
        width: 36, height: 36, borderRadius: 'var(--radius-md)', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-accent)', cursor: 'pointer', color: '#fff',
      }}>+</button>
    </div>
  </div>
) : (
  <PageHeader title="ページ名" subtitle="説明文" actions={...} />
)}
```

---

## フォーム入力フィールド

ページ固有のscoped styleで定義（例: evt-input, mtg-input, evtd-input）:
```css
.xxx-label { display: block; font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 6px; }
.xxx-input {
  width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: var(--radius-md);
  border: 1px solid var(--color-border); background: var(--color-bg-sub); font-size: 14px; color: var(--color-text-primary);
  outline: none; transition: border-color 0.15s, background 0.15s;
}
.xxx-input:focus { border-color: var(--color-accent); background: #fff; }
```

### モバイル対応（iOS自動ズーム防止）
```css
@media (max-width: 768px) {
  .xxx-input { font-size: 16px !important; padding: 12px 14px !important; }
  .xxx-label { font-size: 14px !important; margin-bottom: 8px !important; }
}
```

---

## モバイル対応

- **タイトル**: PC 20px / モバイル 18px（PageHeaderが自動対応）
- **モーダル**: モバイルで自動フルスクリーン（Modalコンポーネントが自動対応）
- **入力フィールド**: モバイルでfont-size: 16px（iOS自動ズーム防止）
- **テーブル**: `overflow-x: auto` でスクロール可能に
- **リスト**: モバイルで名前とselectを縦積み（flexDirection: 'column'）
- **グリッド**: `@media (max-width: 768px)` で1カラムに
- **ボタン**: モバイルで fontSize縮小、padding調整

---

## やってはいけないこと

1. **旧カラー変数を使う** — `var(--primary)`, `var(--text)`, `var(--line)`, `var(--error)` 等は禁止。新トークンを使う
2. **旧パターンを使う** — `btn btn-primary` ではなく `<Button variant="primary">`、`confirm-overlay` ではなく `<Modal>`
3. **Tailwind クラスを使う** — `bg-blue-600`, `text-sm`, `flex`, `p-4` 等は禁止
4. **色をハードコードする** — `#4f46e5` ではなく `var(--color-accent)` を使う
5. **新しいCSSファイルを作る** — 全スタイルは `src/styles/index.css` か ページ固有の `<style>` で
6. **window.confirm/alert/prompt を使う** — Modal を使う
