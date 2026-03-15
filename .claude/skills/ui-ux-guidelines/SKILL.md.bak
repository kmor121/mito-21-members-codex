---
name: ui-ux-guidelines
description: Base44アプリのナビゲーション、メニュー構造、導線設計に関するUI/UXベストプラクティスを適用する。SmartHR・freeeのようなエンタープライズSaaSの使いやすさと視認性を重視した設計を実現する。
trigger: ナビゲーション、メニュー、導線、レイアウト、UI設計に関する作業時
---

# UI/UX Guidelines for Base44 Applications
## Enterprise SaaS Design Standards (SmartHR / freee Style)

## Overview
このスキルは、Base44で構築する業務アプリケーションにおけるUI/UXのベストプラクティスを提供します。SmartHR、freee、kintoneなどのエンタープライズSaaSで採用されている設計原則に基づき、直感的で効率的なユーザー体験を実現します。

## Design Philosophy: Enterprise SaaS

### SmartHR / freee の UI/UX 特徴

1. **クリーンで余白を活かしたデザイン**
   - 白を基調としたミニマルなデザイン
   - 適切な余白（padding/margin）で視認性を確保
   - 情報密度は高すぎず、低すぎず

2. **明確な情報階層**
   - カード型レイアウトで機能をグルーピング
   - セクション間の明確な区切り
   - 視線誘導を意識した配置

3. **親しみやすさと信頼性の両立**
   - 柔らかい角丸（rounded-lg）
   - 落ち着いたカラーパレット
   - 適度なシャドウで奥行き感

4. **効率的なワークフロー**
   - ショートカットキーの提供
   - バルクアクション（一括操作）
   - インラインエディット（その場で編集）

5. **ガイダンスとヘルプの充実**
   - ツールチップでの説明
   - プレースホルダーでの入力例
   - 初回利用時のチュートリアル

## Design System

### Color Palette (SmartHR / freee Style)

```typescript
// プライマリカラー - ブランドカラー
const colors = {
  // SmartHR風: 落ち着いた青
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',  // メインカラー
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // セカンダリカラー - アクセント
  secondary: {
    500: '#10b981',  // 成功・完了（緑）
    600: '#059669',
  },
  
  // ステータスカラー
  status: {
    info: '#3b82f6',      // 情報（青）
    success: '#10b981',   // 成功（緑）
    warning: '#f59e0b',   // 警告（オレンジ）
    error: '#ef4444',     // エラー（赤）
  },
  
  // ニュートラルカラー - freee風の柔らかいグレー
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};
```

### Typography

```typescript
// フォントサイズ - 読みやすさ重視
const fontSize = {
  xs: '0.75rem',    // 12px - 補足情報
  sm: '0.875rem',   // 14px - 本文（SmartHR標準）
  base: '1rem',     // 16px - 本文（freee標準）
  lg: '1.125rem',   // 18px - 小見出し
  xl: '1.25rem',    // 20px - 見出し
  '2xl': '1.5rem',  // 24px - ページタイトル
  '3xl': '1.875rem', // 30px - 大見出し
};

// 行間 - 可読性の確保
const lineHeight = {
  tight: '1.25',
  normal: '1.5',
  relaxed: '1.75',
};
```

### Spacing System

```typescript
// 8の倍数を基準としたスペーシング
const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
};
```

## Core Principles

### 1. 一貫性（Consistency）
- 全ページで同じナビゲーションパターンを使用する
- 色、フォント、スペーシングを統一する
- アクションボタンの配置を統一する（例：保存ボタンは常に右下）

### 2. 予測可能性（Predictability）
- ユーザーが次に何が起こるか予測できるようにする
- 標準的なUIパターンを使用する（例：ハンバーガーメニュー、パンくずリスト）
- フィードバックを即座に提供する（ローディング状態、成功・エラーメッセージ）

### 3. 効率性（Efficiency）
- 主要タスクへは3クリック以内でアクセス可能にする
- 頻繁に使う機能はすぐにアクセスできる場所に配置
- キーボードショートカットを提供する

## Navigation Design

### SmartHR-Style Layout Structure

```typescript
// ✅ 良い例：SmartHR風のサイドバー + メインコンテンツレイアウト
const AppLayout = () => {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* サイドバーナビゲーション - 固定幅 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* ロゴエリア */}
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Logo className="h-8" />
        </div>
        
        {/* ナビゲーションメニュー */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <NavItem icon={HomeIcon} to="/dashboard" active>
            ダッシュボード
          </NavItem>
          <NavItem icon={UsersIcon} to="/employees">
            従業員管理
          </NavItem>
          <NavItem icon={ClipboardIcon} to="/attendance">
            勤怠管理
          </NavItem>
          <NavItem icon={DocumentIcon} to="/documents">
            書類管理
          </NavItem>
          
          {/* セクション区切り */}
          <div className="pt-6 mt-6 border-t border-gray-200">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              設定
            </p>
          </div>
          
          <NavItem icon={CogIcon} to="/settings">
            各種設定
          </NavItem>
        </nav>
        
        {/* ユーザー情報 - 下部固定 */}
        <div className="p-4 border-t border-gray-200">
          <UserProfile />
        </div>
      </aside>
      
      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* トップバー */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <Breadcrumbs />
          </div>
          <div className="flex items-center space-x-4">
            <SearchBar />
            <NotificationButton />
            <HelpButton />
          </div>
        </header>
        
        {/* スクロール可能なコンテンツ */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// ナビゲーションアイテムコンポーネント
const NavItem = ({ icon: Icon, to, active, children }) => {
  return (
    <Link
      to={to}
      className={`
        flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
        ${active 
          ? 'bg-blue-50 text-blue-700' 
          : 'text-gray-700 hover:bg-gray-50'
        }
      `}
    >
      <Icon className={`mr-3 h-5 w-5 ${active ? 'text-blue-700' : 'text-gray-400'}`} />
      {children}
    </Link>
  );
};
```

### Global Navigation
```typescript
// ✅ 良い例：一貫性のあるグローバルナビゲーション
const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* グローバルヘッダー - 全ページ共通 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* ロゴ */}
              <div className="flex-shrink-0 flex items-center">
                <Logo />
              </div>
              {/* メインナビゲーション */}
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <NavLink to="/dashboard">ダッシュボード</NavLink>
                <NavLink to="/orders">受注管理</NavLink>
                <NavLink to="/customers">顧客管理</NavLink>
                <NavLink to="/reports">レポート</NavLink>
              </div>
            </div>
            {/* 右側：ユーザーメニュー */}
            <div className="flex items-center">
              <UserMenu />
            </div>
          </div>
        </nav>
      </header>
      
      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
};
```

### Menu Structure Rules

1. **階層は最大3レベルまで**
   - レベル1：メインカテゴリ（例：受注管理、顧客管理）
   - レベル2：サブカテゴリ（例：新規受注、受注一覧）
   - レベル3：詳細ページ（例：受注詳細）

2. **メニュー項目数の制限**
   - トップレベルメニューは7±2個以内
   - ドロップダウンメニューは5個以内を推奨

3. **現在地の明示**
```typescript
// ✅ 良い例：アクティブ状態を視覚的に明示
const NavLink = ({ to, children }) => {
  const isActive = useMatch(to);
  return (
    <Link
      to={to}
      className={`
        inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium
        ${isActive 
          ? 'border-blue-500 text-gray-900' 
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }
      `}
    >
      {children}
    </Link>
  );
};
```

### Mobile Navigation
```typescript
// ✅ 良い例：レスポンシブなハンバーガーメニュー
const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <>
      {/* ハンバーガーボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
      >
        <MenuIcon className="h-6 w-6" />
      </button>
      
      {/* モバイルメニュー */}
      {isOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <MobileNavLink to="/dashboard">ダッシュボード</MobileNavLink>
            <MobileNavLink to="/orders">受注管理</MobileNavLink>
            <MobileNavLink to="/customers">顧客管理</MobileNavLink>
            <MobileNavLink to="/reports">レポート</MobileNavLink>
          </div>
        </div>
      )}
    </>
  );
};
```

## User Flow Design

### Task-Oriented Design
```typescript
// ✅ 良い例：タスク完了までの流れが明確
const OrderCreationFlow = () => {
  const [step, setStep] = useState(1);
  
  return (
    <div className="max-w-3xl mx-auto">
      {/* 進捗インジケーター */}
      <nav className="mb-8">
        <ol className="flex items-center">
          <Step number={1} active={step === 1} completed={step > 1}>顧客選択</Step>
          <Step number={2} active={step === 2} completed={step > 2}>商品選択</Step>
          <Step number={3} active={step === 3} completed={step > 3}>配送設定</Step>
          <Step number={4} active={step === 4}>確認</Step>
        </ol>
      </nav>
      
      {/* ステップコンテンツ */}
      <div className="bg-white shadow sm:rounded-lg p-6">
        {step === 1 && <CustomerSelection onNext={() => setStep(2)} />}
        {step === 2 && <ProductSelection onNext={() => setStep(3)} onBack={() => setStep(1)} />}
        {step === 3 && <DeliverySettings onNext={() => setStep(4)} onBack={() => setStep(2)} />}
        {step === 4 && <OrderConfirmation onBack={() => setStep(3)} />}
      </div>
    </div>
  );
};
```

### Error States
```typescript
// ✅ 良い例：エラー時も次のアクションが明確
const ErrorState = ({ error, onRetry }) => {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
        <ExclamationIcon className="h-6 w-6 text-red-600" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        データの読み込みに失敗しました
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        {error.message}
      </p>
      <div className="space-x-3">
        <button
          onClick={onRetry}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          再試行
        </button>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          前のページに戻る
        </button>
      </div>
    </div>
  );
};
```

## Visual Hierarchy

### Information Hierarchy
1. **優先度に応じた視覚的重み付け**
   - Primary Actions: `bg-blue-600 text-white`（目立つ色）
   - Secondary Actions: `border border-gray-300 text-gray-700`（控えめ）
   - Tertiary Actions: `text-blue-600 hover:text-blue-700`（テキストリンク）

2. **サイズによる階層**
```typescript
// ✅ 良い例：明確な視覚的階層
const PageHeader = () => {
  return (
    <div className="mb-8">
      {/* パンくずリスト - 小さく控えめ */}
      <nav className="text-sm text-gray-500 mb-2">
        <Breadcrumbs />
      </nav>
      
      {/* ページタイトル - 大きく目立つ */}
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        受注一覧
      </h1>
      
      {/* 説明文 - 中くらいで補足的 */}
      <p className="text-base text-gray-600">
        全ての受注情報を確認・管理できます
      </p>
    </div>
  );
};
```

### Spacing and Grouping
```typescript
// ✅ 良い例：適切なスペーシングでグルーピング
const CustomerCard = ({ customer }) => {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      {/* グループ1：基本情報 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">基本情報</h3>
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">顧客名</dt>
            <dd className="mt-1 text-sm text-gray-900">{customer.name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">電話番号</dt>
            <dd className="mt-1 text-sm text-gray-900">{customer.phone}</dd>
          </div>
        </dl>
      </div>
      
      {/* グループ2：住所情報 */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">住所</h3>
        <address className="text-sm text-gray-900 not-italic">
          {customer.address}
        </address>
      </div>
      
      {/* アクション - 視覚的に分離 */}
      <div className="border-t border-gray-200 pt-4 flex justify-end space-x-3">
        <button className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
          編集
        </button>
        <button className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
          詳細を見る
        </button>
      </div>
    </div>
  );
};
```

## Dashboard Design (freee / SmartHR Style)

### Card-Based Layout

```typescript
// ✅ 良い例：freee風のカードベースダッシュボード
const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="mt-1 text-sm text-gray-500">
            2026年3月8日（日）の概要
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm">
          <PlusIcon className="mr-2 h-5 w-5" />
          新規作成
        </button>
      </div>
      
      {/* KPIカード - 4列グリッド */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="今月の売上"
          value="¥12,345,678"
          change="+12.5%"
          trend="up"
          icon={CurrencyYenIcon}
        />
        <KPICard
          title="新規顧客"
          value="247"
          change="+8.2%"
          trend="up"
          icon={UsersIcon}
        />
        <KPICard
          title="未処理受注"
          value="18"
          change="-3"
          trend="down"
          icon={ClipboardListIcon}
        />
        <KPICard
          title="在庫アラート"
          value="5品目"
          change="要確認"
          trend="warning"
          icon={ExclamationIcon}
        />
      </div>
      
      {/* メインコンテンツエリア - 2列レイアウト */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 最近の受注 */}
        <ContentCard
          title="最近の受注"
          action={
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              すべて見る
            </button>
          }
        >
          <RecentOrders />
        </ContentCard>
        
        {/* 売上推移グラフ */}
        <ContentCard title="売上推移（過去7日間）">
          <SalesChart />
        </ContentCard>
      </div>
      
      {/* タスク一覧 - 全幅 */}
      <ContentCard
        title="今日のタスク"
        subtitle="完了: 8 / 残り: 12"
      >
        <TaskList />
      </ContentCard>
    </div>
  );
};

// KPIカードコンポーネント
const KPICard = ({ title, value, change, trend, icon: Icon }) => {
  const trendColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    warning: 'text-orange-600',
  }[trend];
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          <p className={`mt-2 text-sm font-medium ${trendColor}`}>
            {change}
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
};

// コンテンツカードコンポーネント
const ContentCard = ({ title, subtitle, action, children }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="px-6 py-5">
        {children}
      </div>
    </div>
  );
};
```

### Quick Actions (ショートカット)

```typescript
// ✅ 良い例：よく使う操作をまとめた導線
const QuickActions = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        よく使う操作
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <QuickActionButton
          icon={PlusIcon}
          label="新規受注"
          onClick={() => navigate('/orders/new')}
        />
        <QuickActionButton
          icon={UserAddIcon}
          label="顧客登録"
          onClick={() => navigate('/customers/new')}
        />
        <QuickActionButton
          icon={DocumentAddIcon}
          label="見積作成"
          onClick={() => navigate('/quotes/new')}
        />
        <QuickActionButton
          icon={ChartBarIcon}
          label="レポート"
          onClick={() => navigate('/reports')}
        />
      </div>
    </div>
  );
};

const QuickActionButton = ({ icon: Icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
    >
      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
        <Icon className="h-6 w-6 text-gray-600 group-hover:text-blue-600" />
      </div>
      <span className="mt-2 text-sm font-medium text-gray-700 group-hover:text-blue-700">
        {label}
      </span>
    </button>
  );
};
```

## Data Tables

## Data Tables

### Advanced Table Features (SmartHR Style)

```typescript
// ✅ 良い例：フィルタ・ソート・一括操作機能付きテーブル
const AdvancedTable = () => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* テーブルヘッダー：検索・フィルタ・アクション */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* 検索ボックス */}
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="顧客名、受注番号で検索"
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* フィルタボタン */}
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <FilterIcon className="mr-2 h-4 w-4" />
              フィルタ
            </button>
            
            {/* ソートボタン */}
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <SortIcon className="mr-2 h-4 w-4" />
              並び替え
            </button>
          </div>
          
          {/* 一括操作（選択時のみ表示） */}
          {selectedRows.length > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-700">
                {selectedRows.length}件選択中
              </span>
              <button className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                一括編集
              </button>
              <button className="px-3 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50">
                一括削除
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* テーブル本体 */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* 全選択チェックボックス */}
              <th className="w-12 px-6 py-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              <SortableHeader field="orderNumber" label="受注番号" />
              <SortableHeader field="customerName" label="顧客名" />
              <SortableHeader field="amount" label="金額" align="right" />
              <SortableHeader field="status" label="ステータス" align="center" />
              <SortableHeader field="orderDate" label="受注日" />
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order) => (
              <tr 
                key={order.id}
                className={`
                  hover:bg-gray-50 transition-colors
                  ${selectedRows.includes(order.id) ? 'bg-blue-50' : ''}
                `}
              >
                <td className="w-12 px-6 py-4">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedRows.includes(order.id)}
                    onChange={(e) => handleRowSelect(order.id, e.target.checked)}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                    {order.orderNumber}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {order.customerName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                  ¥{order.amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.orderDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <TableActionMenu order={order} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* ページネーション */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          全 <span className="font-medium">247</span> 件中 
          <span className="font-medium"> 1-20</span> 件を表示
        </div>
        <Pagination />
      </div>
    </div>
  );
};

// ソート可能なヘッダー
const SortableHeader = ({ field, label, align = 'left' }) => {
  const [sortDirection, setSortDirection] = useState(null);
  
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align];
  
  return (
    <th
      className={`px-6 py-3 ${alignClass} text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center ${align === 'right' ? 'justify-end' : ''}`}>
        <span>{label}</span>
        {sortDirection && (
          <SortIcon className={`ml-1 h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
        )}
      </div>
    </th>
  );
};

// アクションメニュー（ドロップダウン）
const TableActionMenu = ({ order }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-lg hover:bg-gray-100"
      >
        <DotsVerticalIcon className="h-5 w-5 text-gray-400" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <MenuButton icon={EyeIcon} onClick={() => viewOrder(order.id)}>
              詳細を見る
            </MenuButton>
            <MenuButton icon={PencilIcon} onClick={() => editOrder(order.id)}>
              編集
            </MenuButton>
            <MenuButton icon={DocumentDuplicateIcon} onClick={() => duplicateOrder(order.id)}>
              複製
            </MenuButton>
            <div className="border-t border-gray-100"></div>
            <MenuButton icon={TrashIcon} onClick={() => deleteOrder(order.id)} danger>
              削除
            </MenuButton>
          </div>
        </div>
      )}
    </div>
  );
};
```

### Status Badges (ステータス表示)

```typescript
// ✅ 良い例：視認性の高いステータスバッジ
const StatusBadge = ({ status }) => {
  const statusConfig = {
    pending: {
      label: '処理中',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      dotColor: 'bg-yellow-400',
    },
    completed: {
      label: '完了',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      dotColor: 'bg-green-400',
    },
    cancelled: {
      label: 'キャンセル',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      dotColor: 'bg-gray-400',
    },
    urgent: {
      label: '緊急',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      dotColor: 'bg-red-400',
    },
  };
  
  const config = statusConfig[status];
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${config.dotColor}`}></span>
      {config.label}
    </span>
  );
};
```

### Table Best Practices
```typescript
// ✅ 良い例：スキャンしやすいテーブル設計
const OrdersTable = ({ orders }) => {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* 左寄せ：テキスト情報 */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              受注番号
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              顧客名
            </th>
            {/* 右寄せ：数値情報 */}
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              金額
            </th>
            {/* 中央寄せ：ステータス */}
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              ステータス
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              アクション
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {order.orderNumber}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {order.customerName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                ¥{order.amount.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <StatusBadge status={order.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-blue-600 hover:text-blue-900">
                  詳細
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## Form Design

## Form Design

### Multi-Step Form (SmartHR / freee Style)

```typescript
// ✅ 良い例：段階的に入力を促すマルチステップフォーム
const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* 進捗インジケーター */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((step) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold
                    ${currentStep > step 
                      ? 'bg-blue-600 text-white' 
                      : currentStep === step
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-200 text-gray-600'
                    }
                  `}
                >
                  {currentStep > step ? <CheckIcon className="h-5 w-5" /> : step}
                </div>
                <span className={`mt-2 text-sm font-medium ${currentStep >= step ? 'text-gray-900' : 'text-gray-500'}`}>
                  {stepLabels[step]}
                </span>
              </div>
              {step < totalSteps && (
                <div className={`flex-1 h-1 mx-4 ${currentStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* フォームコンテンツ */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {currentStep === 1 && <BasicInfoForm />}
        {currentStep === 2 && <DetailForm />}
        {currentStep === 3 && <AdditionalForm />}
        {currentStep === 4 && <ConfirmationForm />}
        
        {/* ナビゲーションボタン */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            戻る
          </button>
          <button
            onClick={() => setCurrentStep(currentStep + 1)}
            className="px-6 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            {currentStep === totalSteps ? '送信' : '次へ'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### Form Field Components

```typescript
// ✅ 良い例：一貫性のあるフォームフィールド
const FormField = ({ label, required, hint, error, children }) => {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 flex items-center">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

// テキスト入力
const TextInput = ({ error, ...props }) => {
  return (
    <input
      type="text"
      className={`
        block w-full px-3 py-2 border rounded-lg shadow-sm text-sm
        focus:outline-none focus:ring-2 transition-colors
        ${error 
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
        }
      `}
      {...props}
    />
  );
};

// セレクトボックス
const Select = ({ options, error, ...props }) => {
  return (
    <select
      className={`
        block w-full px-3 py-2 border rounded-lg shadow-sm text-sm
        focus:outline-none focus:ring-2 transition-colors
        ${error 
          ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
        }
      `}
      {...props}
    >
      <option value="">選択してください</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

// チェックボックスグループ
const CheckboxGroup = ({ options, value, onChange }) => {
  return (
    <div className="space-y-3">
      {options.map((option) => (
        <label key={option.value} className="flex items-start">
          <input
            type="checkbox"
            value={option.value}
            checked={value.includes(option.value)}
            onChange={(e) => {
              const newValue = e.target.checked
                ? [...value, option.value]
                : value.filter((v) => v !== option.value);
              onChange(newValue);
            }}
            className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-3">
            <span className="text-sm font-medium text-gray-700">{option.label}</span>
            {option.description && (
              <span className="block text-sm text-gray-500">{option.description}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
};
```

### Inline Editing (その場で編集)

```typescript
// ✅ 良い例：クリックで編集可能なインラインエディット
const InlineEditField = ({ value, onSave, type = 'text' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  
  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };
  
  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="group flex items-center text-sm text-gray-900 hover:text-blue-600"
      >
        <span>{value}</span>
        <PencilIcon className="ml-2 h-4 w-4 text-gray-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }
  
  return (
    <div className="flex items-center space-x-2">
      <input
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        className="px-2 py-1 border border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
      />
      <button
        onClick={handleSave}
        className="p-1 text-green-600 hover:bg-green-50 rounded"
      >
        <CheckIcon className="h-4 w-4" />
      </button>
      <button
        onClick={handleCancel}
        className="p-1 text-gray-600 hover:bg-gray-50 rounded"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
};
```

### Form Best Practices
```typescript
// ✅ 良い例：使いやすいフォーム設計
const CustomerForm = () => {
  return (
    <form className="space-y-6">
      {/* グルーピング：関連フィールドをまとめる */}
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">基本情報</h3>
            <p className="mt-1 text-sm text-gray-500">
              顧客の基本的な情報を入力してください
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              {/* ラベルは常に表示 */}
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  顧客名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  電話番号
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  placeholder="03-1234-5678"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-2 text-sm text-gray-500">
                  ハイフン区切りで入力してください
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* フォームアクション - 右寄せ、固定位置 */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          保存
        </button>
      </div>
    </form>
  );
};
```

## Modals and Notifications

### Modal Dialog (SmartHR Style)

```typescript
// ✅ 良い例：適切なモーダルデザイン
const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* オーバーレイ */}
      <div 
        className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* モーダルコンテンツ */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* ヘッダー */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
          
          {/* コンテンツ */}
          <div className="px-6 py-5">
            {children}
          </div>
          
          {/* フッター */}
          {footer && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 確認ダイアログ
const ConfirmDialog = ({ isOpen, onConfirm, onCancel, title, message, confirmLabel = '実行', danger = false }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium text-white
              ${danger 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
              }
            `}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">{message}</p>
    </Modal>
  );
};
```

### Toast Notifications (freee Style)

```typescript
// ✅ 良い例：非侵襲的なトースト通知
const Toast = ({ type, message, onClose }) => {
  const config = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      textColor: 'text-green-800',
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      iconColor: 'text-red-600',
      textColor: 'text-red-800',
    },
    warning: {
      icon: ExclamationIcon,
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
      textColor: 'text-yellow-800',
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-800',
    },
  }[type];
  
  const Icon = config.icon;
  
  return (
    <div className={`${config.bgColor} border-l-4 border-${type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'yellow' : 'blue'}-600 p-4 rounded-r-lg shadow-lg`}>
      <div className="flex items-start">
        <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5`} />
        <p className={`ml-3 text-sm font-medium ${config.textColor}`}>
          {message}
        </p>
        <button
          onClick={onClose}
          className={`ml-auto pl-3 ${config.iconColor} hover:opacity-75`}
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// トーストコンテナ（画面右上に固定）
const ToastContainer = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-4 w-96">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} />
      ))}
    </div>
  );
};
```

## Loading and Empty States

### Loading States
```typescript
// ✅ 良い例：適切なローディング表示
const DataList = () => {
  const { data, isLoading, error } = useQuery('orders');
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-sm text-gray-500">読み込み中...</span>
      </div>
    );
  }
  
  if (error) {
    return <ErrorState error={error} />;
  }
  
  return <OrdersTable orders={data} />;
};
```

## Loading and Empty States

### Skeleton Loading (SmartHR Style)

```typescript
// ✅ 良い例：コンテンツの形を示すスケルトンローダー
const SkeletonCard = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="mt-6 space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
};

const SkeletonTable = ({ rows = 5 }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="animate-pulse">
        {/* ヘッダー */}
        <div className="bg-gray-50 px-6 py-4 flex space-x-4">
          <div className="h-4 bg-gray-200 rounded w-32"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        {/* 行 */}
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-6 py-4 border-t border-gray-200 flex space-x-4">
            <div className="h-4 bg-gray-200 rounded w-32"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Empty States
```typescript
// ✅ 良い例：次のアクションを促す空状態
const EmptyState = ({ onCreateNew }) => {
  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-medium text-gray-900">受注データがありません</h3>
      <p className="mt-1 text-sm text-gray-500">
        新しい受注を作成して始めましょう
      </p>
      <div className="mt-6">
        <button
          onClick={onCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          新規受注
        </button>
      </div>
    </div>
  );
};
```

## Help and Onboarding

### Tooltip (ヘルプテキスト)

```typescript
// ✅ 良い例：適切なツールチップ表示
const Tooltip = ({ content, children, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];
  
  return (
    <div className="relative inline-flex">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {isVisible && (
        <div className={`absolute ${positionClasses} z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap`}>
          {content}
          {/* 矢印 */}
          <div className={`absolute w-2 h-2 bg-gray-900 rotate-45 ${
            position === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' :
            position === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' :
            position === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' :
            'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
          }`}></div>
        </div>
      )}
    </div>
  );
};

// 使用例
<Tooltip content="このフィールドは必須です">
  <button className="text-gray-400 hover:text-gray-600">
    <QuestionMarkCircleIcon className="h-5 w-5" />
  </button>
</Tooltip>
```

### Onboarding Tour (初回利用ガイド)

```typescript
// ✅ 良い例：段階的な機能説明
const OnboardingTour = ({ steps, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(true);
  
  if (!isActive || currentStep >= steps.length) return null;
  
  const step = steps[currentStep];
  
  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-gray-900 bg-opacity-75 z-40" />
      
      {/* ハイライト */}
      <div
        className="fixed z-50 ring-4 ring-blue-500 rounded-lg"
        style={{
          top: step.elementRect.top - 4,
          left: step.elementRect.left - 4,
          width: step.elementRect.width + 8,
          height: step.elementRect.height + 8,
        }}
      />
      
      {/* ガイドカード */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl p-6 max-w-sm"
        style={{
          top: step.cardPosition.top,
          left: step.cardPosition.left,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-medium">
              {currentStep + 1}
            </span>
            <h3 className="ml-3 text-lg font-semibold text-gray-900">
              {step.title}
            </h3>
          </div>
          <button
            onClick={() => setIsActive(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-700 mb-6">
          {step.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {currentStep + 1} / {steps.length}
          </span>
          <div className="space-x-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                戻る
              </button>
            )}
            <button
              onClick={() => {
                if (currentStep === steps.length - 1) {
                  setIsActive(false);
                  onComplete();
                } else {
                  setCurrentStep(currentStep + 1);
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              {currentStep === steps.length - 1 ? '完了' : '次へ'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
```

### Help Panel (ヘルプパネル)

```typescript
// ✅ 良い例：コンテキストに応じたヘルプ表示
const HelpPanel = ({ isOpen, onClose }) => {
  return (
    <div
      className={`
        fixed top-0 right-0 h-full w-96 bg-white shadow-xl transform transition-transform duration-300 z-40
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}
    >
      <div className="flex flex-col h-full">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">ヘルプ</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                よくある質問
              </h4>
              <div className="space-y-2">
                <HelpItem question="受注の登録方法は？" />
                <HelpItem question="顧客情報を編集するには？" />
                <HelpItem question="レポートをエクスポートするには？" />
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                キーボードショートカット
              </h4>
              <div className="space-y-2">
                <ShortcutItem keys={['⌘', 'K']} description="検索を開く" />
                <ShortcutItem keys={['⌘', 'N']} description="新規作成" />
                <ShortcutItem keys={['⌘', 'S']} description="保存" />
              </div>
            </div>
            
            <div className="pt-6 border-t border-gray-200">
              <button className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                お問い合わせ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

## Accessibility Guidelines

### Keyboard Navigation
- すべてのインタラクティブ要素はキーボードでアクセス可能
- Tab順序は論理的な流れに沿う
- フォーカス状態を視覚的に明示

### Screen Reader Support
```typescript
// ✅ 良い例：適切なARIA属性
<button
  aria-label="検索"
  onClick={handleSearch}
>
  <SearchIcon className="h-5 w-5" />
</button>

<nav aria-label="メインナビゲーション">
  <ul>
    <li><a href="/dashboard">ダッシュボード</a></li>
    <li><a href="/orders" aria-current="page">受注管理</a></li>
  </ul>
</nav>
```

## Anti-Patterns（避けるべきパターン）

### ❌ 悪い例：一貫性のないナビゲーション
```typescript
// ページごとに異なるメニュー構造
// Page1: ヘッダーにメニュー
// Page2: サイドバーにメニュー
// Page3: フッターにメニュー
```

### ❌ 悪い例：情報過多な画面
```typescript
// 1画面に詰め込みすぎ
<div>
  <Statistics /> {/* 10個の統計カード */}
  <RecentOrders /> {/* 100行のテーブル */}
  <Charts /> {/* 5つのグラフ */}
  <Notifications /> {/* 通知リスト */}
  <Settings /> {/* 設定パネル */}
</div>
```

### ❌ 悪い例：不明確なアクション
```typescript
// ボタンのラベルが曖昧
<button>OK</button>
<button>送信</button>
<button>決定</button>

// ✅ 良い例：具体的なアクション
<button>注文を確定する</button>
<button>変更を保存</button>
<button>削除を実行</button>
```

## Implementation Checklist

新しい画面やコンポーネントを作成する際は、以下をチェック：

### レイアウト・ナビゲーション
- [ ] サイドバーナビゲーションは固定幅（w-64）で一貫しているか？
- [ ] 現在位置がハイライト表示されているか？
- [ ] 主要タスクは3クリック以内でアクセス可能か？
- [ ] モバイルではハンバーガーメニューに変換されるか？

### カラー・タイポグラフィ
- [ ] カラーパレットは定義済みの色を使用しているか？
- [ ] 本文フォントサイズは14px（sm）または16px（base）か？
- [ ] 行間は適切か（normal: 1.5）？
- [ ] スペーシングは8の倍数を基準にしているか？

### データ表示
- [ ] テーブルには検索・フィルタ・ソート機能があるか？
- [ ] 一括操作（バルクアクション）は必要か？
- [ ] ステータスバッジは視認性が高いか？
- [ ] ページネーションは実装されているか？

### フォーム
- [ ] 複雑なフォームはマルチステップになっているか？
- [ ] 必須項目に「*」マークがついているか？
- [ ] エラーメッセージは具体的で解決方法を示しているか？
- [ ] 入力例（プレースホルダー）は提供されているか？

### フィードバック
- [ ] ローディング状態はスケルトンで表示されるか？
- [ ] 成功・エラー時のトースト通知は表示されるか？
- [ ] 空状態で次のアクションを促しているか？
- [ ] 確認ダイアログは危険な操作前に表示されるか？

### ヘルプ・ガイダンス
- [ ] ツールチップで補足説明を提供しているか？
- [ ] 初回利用時のチュートリアルは用意されているか？
- [ ] ヘルプパネルやFAQへのアクセスは容易か？
- [ ] キーボードショートカットは実装されているか？

### 視覚的品質
- [ ] カードに適切なシャドウ（shadow-sm）が適用されているか？
- [ ] 角丸は一貫して使用されているか（rounded-lg）？
- [ ] 余白（padding/margin）は適切か？
- [ ] ホバー状態のトランジションは滑らかか？

### アクセシビリティ
- [ ] キーボードナビゲーションは機能するか？
- [ ] フォーカス状態は視覚的に明示されているか？
- [ ] ARIA属性は適切に設定されているか？
- [ ] コントラスト比は十分か（WCAG AA基準）？

## SmartHR / freee Style Principles Summary

### 1. クリーンで余白を活かしたデザイン
- 白背景（bg-white）を基調
- カード間の余白は1.5rem（gap-6）
- セクション内のpaddingは1.5rem（p-6）

### 2. 明確な情報階層
- カード型レイアウトで機能をグルーピング
- 見出しサイズの段階的な変化（text-2xl → text-lg → text-sm）
- border-gray-200での明確な区切り

### 3. 親しみやすさと信頼性
- rounded-lgの柔らかい角丸
- blue-600をメインカラーに
- shadow-smの控えめなシャドウ

### 4. 効率的なワークフロー
- インラインエディット機能
- 一括操作（バルクアクション）
- キーボードショートカット

### 5. ガイダンスの充実
- ツールチップでの説明
- プレースホルダーでの入力例
- 初回利用時のチュートリアル

## When to Apply This Skill

このスキルは以下の場合に適用してください：

1. 新しいページやレイアウトを作成する時
2. ナビゲーションメニューを実装・修正する時
3. データテーブルやリストを設計する時
4. フォームを作成する時
5. エラーハンドリングを実装する時
6. 既存UIのリファクタリング時
7. ユーザーから「使いにくい」「わかりにくい」というフィードバックがあった時

## References

- [Base44 Design Documentation](https://docs.base44.com/Building-your-app/Design)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
