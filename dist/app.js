const REMOTE_ORIGIN = "https://mito21-members-codex-da487265.base44.app";
const API_ORIGIN =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? REMOTE_ORIGIN
    : window.location.origin;
const FUNCTION_BASE = `${API_ORIGIN}/functions`;
const APPLICATION_DRAFT_KEY = "mito21-application-draft";
const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PROFILE_IMAGE_ACCEPTED_TYPES = ["image/jpeg", "image/png"];
const PROFILE_IMAGE_ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png"];
let applicationProfileImageFile = null;
let applicationProfileImagePreviewUrl = "";

const ADMIN_NAV_ITEMS = [
  { href: "/admin/dashboard", key: "admin-dashboard", label: "ダッシュボード", shortLabel: "A1" },
  { href: "/admin/members", key: "admin-members", label: "会員一覧", shortLabel: "A2" },
  { href: "/admin/applications", key: "admin-applications", label: "入会申込管理", shortLabel: "A4" },
  { href: "/admin/dues-management", key: "admin-dues", label: "会費管理", shortLabel: "A5" },
  { href: "/admin/organization-chart", key: "admin-organization", label: "組織図管理", shortLabel: "A6" },
  { href: "/admin/newsletters", key: "admin-newsletters", label: "配信管理", shortLabel: "A7" },
  { href: "/admin/fiscal-years", key: "admin-fiscal-years", label: "年度管理", shortLabel: "A8" },
  { href: "/admin/documents", key: "admin-documents", label: "資料管理", shortLabel: "A10" },
  { href: "/admin/settings", key: "admin-settings", label: "設定", shortLabel: "A9" }
];

const MEMBER_NAV_ITEMS = [
  { href: "/directory", key: "member-directory", label: "名簿閲覧", shortLabel: "M1" },
  { href: "/organization", key: "member-organization", label: "組織図", shortLabel: "M5" },
  { href: "/info", key: "member-info", label: "基本情報", shortLabel: "M4" },
  { href: "/manual", key: "member-manual", label: "運用マニュアル", shortLabel: "M6" },
  { href: "/mypage", key: "member-mypage", label: "マイページ", shortLabel: "M3" }
];

function getRouteMeta(pathname) {
  if (pathname === "/") {
    return {
      mode: "public",
      section: "Public",
      title: "公開トップ",
      description: "団体案内と入会申込の入口です。",
      currentKey: "public-home"
    };
  }

  if (pathname === "/apply") {
    return {
      mode: "public",
      section: "Public",
      title: "入会申込",
      description: "必要事項を入力し、確認後に送信します。",
      currentKey: "public-apply"
    };
  }

  if (pathname === "/apply/confirm") {
    return {
      mode: "public",
      section: "Public",
      title: "申込内容の確認",
      description: "入力内容を確認して送信します。",
      currentKey: "public-apply-confirm"
    };
  }

  if (pathname === "/apply/complete" || pathname === "/complete") {
    return {
      mode: "public",
      section: "Public",
      title: "申込完了",
      description: "申込受付完了後の案内を表示します。",
      currentKey: "public-apply-complete"
    };
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const adminMetaMap = {
      "/admin": { title: "ダッシュボード", description: "主要な集計と管理導線をまとめて確認します。", currentKey: "admin-dashboard", crumb: "A1" },
      "/admin/dashboard": { title: "ダッシュボード", description: "主要な集計と管理導線をまとめて確認します。", currentKey: "admin-dashboard", crumb: "A1" },
      "/admin/members": { title: "会員一覧", description: "会員の検索・絞り込み・詳細確認を行います。", currentKey: "admin-members", crumb: "A2" },
      "/admin/applications": { title: "入会申込管理", description: "申請中の入会申込を確認し、承認・却下します。", currentKey: "admin-applications", crumb: "A4" },
      "/admin/dues": { title: "会費管理", description: "当年度会費の一覧、設定、納入状態を管理します。", currentKey: "admin-dues", crumb: "A5" },
      "/admin/dues-management": { title: "会費管理", description: "当年度会費の一覧、設定、納入状態を管理します。", currentKey: "admin-dues", crumb: "A5" },
      "/admin/organization": { title: "組織図管理", description: "年度ごとの組織と配属を編集します。", currentKey: "admin-organization", crumb: "A6" },
      "/admin/organization-chart": { title: "組織図管理", description: "年度ごとの組織と配属を編集します。", currentKey: "admin-organization", crumb: "A6" },
      "/admin/delivery": { title: "配信管理", description: "配信設定の下書き保存と対象確認を行います。", currentKey: "admin-newsletters", crumb: "A7" },
      "/admin/newsletters": { title: "配信管理", description: "配信設定の下書き保存と対象確認を行います。", currentKey: "admin-newsletters", crumb: "A7" },
      "/admin/fiscal-years": { title: "年度管理", description: "年度追加、編集、現在年度切替を行います。", currentKey: "admin-fiscal-years", crumb: "A8" },
      "/admin/settings": { title: "設定", description: "運用設定への導線をまとめたハブです。", currentKey: "admin-settings", crumb: "A9" },
      "/admin/documents": { title: "資料管理", description: "M4 と M6 の表示資料を登録・公開します。", currentKey: "admin-documents", crumb: "A10" }
    };

    if (pathname.startsWith("/admin/members/")) {
      return {
        mode: "admin",
        section: "Admin",
        title: "会員詳細・編集",
        description: "会員詳細の確認と更新を行います。",
        currentKey: "admin-members",
        crumb: "A3"
      };
    }

    return {
      mode: "admin",
      section: "Admin",
      ...(adminMetaMap[pathname] || { title: "管理画面", description: "管理機能を利用します。", currentKey: "", crumb: "Admin" })
    };
  }

  if (pathname === "/directory") {
    return { mode: "member", section: "Member", title: "名簿", description: "公開設定に従って会員名簿を閲覧します。", currentKey: "member-directory", crumb: "M1" };
  }
  if (pathname === "/mypage") {
    return { mode: "member", section: "Member", title: "マイページ", description: "会員自身の情報と公開設定を確認します。", currentKey: "member-mypage", crumb: "M3" };
  }
  if (pathname === "/info") {
    return { mode: "member", section: "Member", title: "基本情報", description: "年度別の基本情報と資料を閲覧します。", currentKey: "member-info", crumb: "M4" };
  }
  if (pathname === "/organization") {
    return { mode: "member", section: "Member", title: "組織図", description: "年度別の組織と配属を閲覧します。", currentKey: "member-organization", crumb: "M5" };
  }
  if (pathname === "/manual") {
    return { mode: "member", section: "Member", title: "運用マニュアル", description: "公開中の運用マニュアルを確認します。", currentKey: "member-manual", crumb: "M6" };
  }

  if (pathname.startsWith("/directory/members/")) {
    return { mode: "member", section: "Member", title: "会員詳細", description: "公開設定に応じた会員情報を表示", currentKey: "member-directory", crumb: "M2" };
  }

  return {
    mode: "public",
    section: "Public",
    title: "MITO21 Members",
    description: "会員管理システム",
    currentKey: "public-home"
  };
}

function renderWorkspaceNav(items, currentKey) {
  return items
    .map((item) => {
      const isActive = item.key === currentKey;
      return `
        <a class="workspace-nav-link ${isActive ? "is-active" : ""}" href="${item.href}"${isActive ? ' aria-current="page"' : ""}>
          <span>${escapeHtml(item.label)}</span>
        </a>
      `;
    })
    .join("");
}

function renderPublicNav(currentKey) {
  const items = [
    { href: "/", key: "public-home", label: "公開トップ" },
    { href: "/apply", key: "public-apply", label: "入会申込" },
    { href: "/directory", key: "member-directory", label: "会員名簿" },
    { href: "/manual", key: "member-manual", label: "運用マニュアル" }
  ];

  return items
    .map((item) => {
      const isActive = item.key === currentKey;
      return `<a class="public-nav-link ${isActive ? "is-active" : ""}" href="${item.href}"${isActive ? ' aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`;
    })
    .join("");
}

function renderAppChrome(meta, html) {
  if (meta.mode === "admin" || meta.mode === "member") {
    const isAdmin = meta.mode === "admin";
    const modeLabel = isAdmin ? "管理画面" : "会員向け";
    const adminNav = isAdmin ? `
          <div class="workspace-group-label">管理メニュー</div>
          <nav class="workspace-nav">
            ${renderWorkspaceNav(ADMIN_NAV_ITEMS, meta.currentKey)}
          </nav>` : "";
    const memberNav = `
          <div class="workspace-group-label">会員メニュー</div>
          <nav class="workspace-nav">
            ${renderWorkspaceNav(MEMBER_NAV_ITEMS, meta.currentKey)}
          </nav>`;
    return `
      <div class="workspace-shell">
        <div class="sidebar-overlay" id="sidebar-overlay"></div>
        <aside class="workspace-sidebar" id="workspace-sidebar">
          <a class="workspace-brand" href="/">
            <span class="workspace-brand-mark">M</span>
            <div>
              <strong>MITO21</strong>
              <span>${modeLabel}</span>
            </div>
          </a>
          ${adminNav}
          ${memberNav}
        </aside>
        <div class="workspace-main">
          <header class="workspace-header">
            <button class="mobile-nav-toggle" id="mobile-nav-toggle" type="button" aria-label="メニュー"><span></span><span></span><span></span></button>
            <p class="workspace-breadcrumb">${escapeHtml(meta.title || modeLabel)}</p>
          </header>
          <main class="workspace-content">${html}</main>
        </div>
      </div>
    `;
  }

  return `
    <div class="public-shell">
      <header class="public-header">
        <div class="public-header-inner">
          <a class="public-brand" href="/">
            <span class="workspace-brand-mark">M</span>
            <div>
              <strong>MITO21</strong>
              <span>水戸21の会</span>
            </div>
          </a>
          <nav class="public-nav">
            ${renderPublicNav(meta.currentKey)}
          </nav>
        </div>
      </header>
      <main class="public-content">${html}</main>
    </div>
  `;
}

function bindMobileNav() {
  const toggle = document.getElementById("mobile-nav-toggle");
  const sidebar = document.getElementById("workspace-sidebar");
  const overlay = document.getElementById("sidebar-overlay");
  if (toggle && sidebar && overlay) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("is-open");
      overlay.classList.toggle("is-visible");
    });
    overlay.addEventListener("click", () => {
      sidebar.classList.remove("is-open");
      overlay.classList.remove("is-visible");
    });
  }
}

function setView(html) {
  const app = document.getElementById("app");
  app.innerHTML = renderAppChrome(getRouteMeta(window.location.pathname), html);
  bindMobileNav();
}

function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type} toast-enter`;
  toast.innerHTML = `<span class="toast-icon">${type === "success" ? "&#10003;" : type === "error" ? "&#10007;" : "&#9432;"}</span><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.remove("toast-enter"));
  setTimeout(() => {
    toast.classList.add("toast-exit");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "はい" : "いいえ";
  }

  return String(value);
}

function renderMemberImage(profileImage, name, size = "detail") {
  const normalizedImage = String(profileImage || "").trim();
  const normalizedName = String(name || "").trim();
  const initial = normalizedName ? normalizedName.charAt(0) : "M";

  if (normalizedImage) {
    return `
      <div class="member-image member-image-${size}">
        <img src="${escapeHtml(normalizedImage)}" alt="${escapeHtml(normalizedName || "会員プロフィール画像")}" loading="lazy" />
      </div>
    `;
  }

  return `
    <div class="member-image member-image-${size} is-placeholder" aria-label="プロフィール画像未設定">
      <span>${escapeHtml(initial)}</span>
    </div>
  `;
}

function isChecked(value) {
  return value === true ? "checked" : "";
}

function normalizeMemberStatus(value) {
  return value === "active" ? "活動中" : String(value ?? "").trim();
}

function formatFiscalYearLabel(fiscalYear) {
  if (!fiscalYear || !fiscalYear.year) {
    return "年度未設定";
  }

  return `${fiscalYear.year}年度`;
}

function formatCurrency(value) {
  const numericValue = Number(value);
  const normalized = Number.isFinite(numericValue) ? numericValue : 0;
  return `¥${normalized.toLocaleString("ja-JP")}`;
}

const A5_DUE_STATUSES = ["未納", "納入済"];

function renderBasicInfoDocument(document) {
  const content = document.content
    ? `<div class="basic-info-content">${document.content}</div>`
    : '<p class="muted">本文は登録されていません。</p>';
  const attachment = document.attachment?.url
    ? `
        <div class="actions">
          <a class="text-link" href="${escapeHtml(document.attachment.url)}" target="_blank" rel="noreferrer">添付を見る: ${escapeHtml(document.attachment.label || "添付ファイル")}</a>
        </div>
      `
    : '<p class="muted">添付ファイルはありません。</p>';

  return `
    <article class="basic-info-document">
      <div class="panel-heading compact">
        <div>
          <h3>${escapeHtml(document.title || "無題")}</h3>
        </div>
        ${document.updated_at ? `<span class="pill">${escapeHtml(document.updated_at.slice(0, 10))}</span>` : ""}
      </div>
      ${content}
      ${attachment}
    </article>
  `;
}

function renderBasicInfoSection(section, isActive) {
  const documents = section.documents || [];

  return `
    <section class="detail-card stack basic-info-panel ${isActive ? "is-active" : ""}" data-info-panel="${escapeHtml(section.key)}"${isActive ? "" : ' hidden="hidden"'}>
      <div class="panel-heading">
        <div>
          <h2>${escapeHtml(section.label)}</h2>
        </div>
      </div>
      ${
        documents.length
          ? documents.map((document) => renderBasicInfoDocument(document)).join("")
          : `<p class="empty-state">${escapeHtml(section.label)}はまだ公開されていません。</p>`
      }
    </section>
  `;
}

function renderOrganizationAssignment(assignment) {
  const member = assignment.member || {};
  return `
    <li class="organization-assignment">
      ${renderMemberImage(member.profile_image, member.name_kanji, "thumb")}
      <div class="org-assignment-info">
        <strong>${escapeHtml(displayValue(assignment.role))}</strong>
        <a class="text-link" href="/directory/members/${encodeURIComponent(member.id || "")}">${escapeHtml(displayValue(member.name_kanji))}</a>
      </div>
      ${member.member_type ? `<span class="pill">${escapeHtml(member.member_type)}</span>` : ""}
    </li>
  `;
}

function renderOrganizationCard(organization, isChild) {
  const assignments = organization.assignments || [];
  const children = organization.children || [];

  return `
    <article class="organization-card${isChild ? " org-child" : ""}">
      <div class="panel-heading">
        <div>
          <span class="pill">${escapeHtml(displayValue(organization.org_type || "組織"))}</span>
          <h2>${escapeHtml(displayValue(organization.org_name))}</h2>
        </div>
        <span class="muted">${assignments.length}名</span>
      </div>
      ${
        assignments.length
          ? `<ul class="organization-assignment-list">${assignments.map((assignment) => renderOrganizationAssignment(assignment)).join("")}</ul>`
          : '<p class="empty-state">この組織にはまだ配属データがありません。</p>'
      }
      ${children.length ? `<div class="org-children">${children.map((child) => renderOrganizationCard(child, true)).join("")}</div>` : ""}
    </article>
  `;
}

function renderManualCard(manual) {
  const content = manual.content
    ? `<div class="basic-info-content">${manual.content}</div>`
    : '<p class="muted">本文は登録されていません。</p>';
  const attachment = manual.attachment?.url
    ? `
        <div class="actions">
          <a class="text-link" href="${escapeHtml(manual.attachment.url)}" target="_blank" rel="noreferrer">添付を見る: ${escapeHtml(manual.attachment.label || "添付ファイル")}</a>
        </div>
      `
    : '<p class="muted">添付ファイルはありません。</p>';

  return `
    <article class="basic-info-document">
      <div class="panel-heading compact">
        <div>
          <h2>${escapeHtml(displayValue(manual.title))}</h2>
        </div>
        ${manual.updated_at ? `<span class="pill">${escapeHtml(manual.updated_at.slice(0, 10))}</span>` : ""}
      </div>
      ${content}
      ${attachment}
    </article>
  `;
}

function renderManualPage(data) {
  const manuals = data.manuals || [];

  // Group by category
  const categoryMap = new Map();
  const uncategorized = [];
  for (const manual of manuals) {
    const cat = String(manual.category || "").trim();
    if (cat) {
      if (!categoryMap.has(cat)) categoryMap.set(cat, []);
      categoryMap.get(cat).push(manual);
    } else {
      uncategorized.push(manual);
    }
  }

  const categoryGroups = [...categoryMap.entries()].sort((a, b) => a[0].localeCompare(b[0], "ja"));

  function renderGroup(title, items) {
    return `
      <div class="manual-category-group">
        <h3 class="manual-category-title">${escapeHtml(title)}</h3>
        <div class="manual-list">${items.map((m) => renderManualCard(m)).join("")}</div>
      </div>
    `;
  }

  return `
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">運用マニュアル</h1>
        <p class="page-description">公開中の運用マニュアルを確認</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body stack">
          <div class="panel-heading"><div><h2>マニュアル一覧</h2></div></div>
          ${
            manuals.length
              ? `${categoryGroups.map(([cat, items]) => renderGroup(cat, items)).join("")}${uncategorized.length ? renderGroup("その他", uncategorized) : ""}`
              : '<p class="empty-state">公開中の運用マニュアルはまだ登録されていません。</p>'
          }
        </div>
      </section>
    </section>
  `;
}

async function renderManualRoute() {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">運用マニュアル</h1>
        <p class="page-description">公開中のマニュアルを確認</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body">
          <div class="loading-state"><div class="spinner"></div><p>読み込み中...</p></div>
        </div>
      </section>
    </section>
  `);

  try {
    const result = await apiRequest("get-member-manual");
    setView(renderManualPage(result));
  } catch (error) {
    setView(`
      <section class="admin-shell">
        <div class="page-header">
          <h1 class="page-title">運用マニュアル</h1>
          <p class="page-description">公開中のマニュアルを確認</p>
        </div>
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <p class="message error">${escapeHtml(error.message || "運用マニュアルの取得に失敗しました。")}</p>
            <div class="actions">
              <a class="text-link" href="/directory">名簿閲覧へ</a>
              <a class="text-link" href="/info">基本情報へ</a>
              <a class="text-link" href="/organization">組織図へ</a>
            </div>
          </div>
        </section>
      </section>
    `);
  }
}

function renderOrganizationPage(data) {
  const years = data.fiscal_years || [];
  const selectedFiscalYear = data.selected_fiscal_year || null;
  const selectedFiscalYearId = selectedFiscalYear?.id || "";
  const organizations = data.organizations || [];

  return `
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">組織図</h1>
        <p class="page-description">年度ごとの組織と配属を一覧表示</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body stack">
          <div class="panel-heading"><div><h2>${selectedFiscalYear ? `${escapeHtml(formatFiscalYearLabel(selectedFiscalYear))}の組織図` : "組織図"}</h2></div></div>
          <form id="organization-filter-form" class="basic-info-filter" novalidate>
            <div class="field">
              <label for="organization-fiscal-year">年度</label>
              <select id="organization-fiscal-year" name="fiscal_year_id">
                ${
                  years.length
                    ? years
                        .map(
                          (fiscalYear) => `
                            <option value="${escapeHtml(fiscalYear.id)}"${fiscalYear.id === selectedFiscalYearId ? " selected" : ""}>
                              ${escapeHtml(formatFiscalYearLabel(fiscalYear))}${fiscalYear.is_current ? "（現在年度）" : ""}
                            </option>
                          `
                        )
                        .join("")
                    : '<option value="">年度データ未登録</option>'
                }
              </select>
            </div>
          </form>
          ${
            years.length
              ? ""
              : '<p class="empty-state">FiscalYears が未登録のため、表示対象の年度を決められません。年度を登録すると M5 で切替表示できます。</p>'
          }
          ${
            years.length && data.organizations_count === 0
              ? '<p class="empty-state">この年度の組織データはまだ登録されていません。</p>'
              : ""
          }
          ${
            years.length && data.organizations_count > 0 && data.assignments_count === 0
              ? '<p class="empty-state">この年度の配属データはまだ登録されていません。</p>'
              : ""
          }
          <div class="organization-tree">
            ${(() => {
              // Build parent-child tree
              const orgById = new Map();
              organizations.forEach((org) => { orgById.set(org.id, { ...org, children: [] }); });
              const roots = [];
              orgById.forEach((org) => {
                const parentId = org.parent_id || "";
                if (parentId && orgById.has(parentId)) {
                  orgById.get(parentId).children.push(org);
                } else {
                  roots.push(org);
                }
              });
              return roots.length
                ? roots.map((org) => renderOrganizationCard(org, false)).join("")
                : "";
            })()}
          </div>
        </div>
      </section>
    </section>
  `;
}

function bindOrganizationInteractions() {
  const fiscalYearSelect = document.getElementById("organization-fiscal-year");

  if (!fiscalYearSelect) {
    return;
  }

  fiscalYearSelect.addEventListener("change", () => {
    const nextUrl = new URL(window.location.href);
    const selectedFiscalYearId = String(fiscalYearSelect.value || "").trim();

    if (selectedFiscalYearId) {
      nextUrl.searchParams.set("fiscalYearId", selectedFiscalYearId);
    } else {
      nextUrl.searchParams.delete("fiscalYearId");
    }

    window.location.assign(nextUrl.pathname + nextUrl.search);
  });
}

async function renderOrganizationRoute() {
  const selectedFiscalYearId = new URLSearchParams(window.location.search).get("fiscalYearId") || "";

  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">組織図</h1>
        <p class="page-description">年度ごとの組織と配属を一覧表示</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body">
          <div class="loading-state"><div class="spinner"></div><p>読み込み中...</p></div>
        </div>
      </section>
    </section>
  `);

  try {
    const fiscalYears = await apiRequest("list-fiscal-years");
    const effectiveFiscalYearId = selectedFiscalYearId || fiscalYears.current_fiscal_year_id || "";
    const query = effectiveFiscalYearId
      ? `get-member-organization-chart?fiscalYearId=${encodeURIComponent(effectiveFiscalYearId)}`
      : "get-member-organization-chart";
    const result = await apiRequest(query);

    setView(
      renderOrganizationPage({
        fiscal_years: fiscalYears.years || result.fiscal_years || [],
        selected_fiscal_year: result.selected_fiscal_year,
        organizations_count: result.organizations_count || 0,
        assignments_count: result.assignments_count || 0,
        organizations: result.organizations || []
      })
    );
    bindOrganizationInteractions();
  } catch (error) {
    setView(`
      <section class="admin-shell">
        <div class="page-header">
          <h1 class="page-title">組織図</h1>
          <p class="page-description">年度ごとの組織と配属を一覧表示</p>
        </div>
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <p class="message error">${escapeHtml(error.message || "組織図の取得に失敗しました。")}</p>
            <div class="actions">
              <a class="text-link" href="/directory">名簿閲覧へ</a>
              <a class="text-link" href="/mypage">マイページへ</a>
              <a class="text-link" href="/info">基本情報へ</a>
              <a class="text-link" href="/manual">運用マニュアルへ</a>
            </div>
          </div>
        </section>
      </section>
    `);
  }
}

function renderBasicInfoPage(data, selectedTab) {
  const years = data.fiscal_years || [];
  const selectedFiscalYear = data.selected_fiscal_year || null;
  const selectedFiscalYearId = selectedFiscalYear?.id || "";
  const sections = data.sections || [];
  const activeTab = selectedTab || sections[0]?.key || "business_plan";

  return `
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">基本情報</h1>
        <p class="page-description">年度ごとの事業計画・理念・会則・年間スケジュール</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body stack">
          <div class="panel-heading"><div><h2>${selectedFiscalYear ? `${escapeHtml(formatFiscalYearLabel(selectedFiscalYear))}の基本情報` : "基本情報"}</h2></div></div>
          <form id="basic-info-filter-form" class="basic-info-filter" novalidate>
            <div class="field">
              <label for="basic-info-fiscal-year">年度</label>
              <select id="basic-info-fiscal-year" name="fiscal_year_id">
                ${
                  years.length
                    ? years
                        .map(
                          (fiscalYear) => `
                            <option value="${escapeHtml(fiscalYear.id)}"${fiscalYear.id === selectedFiscalYearId ? " selected" : ""}>
                              ${escapeHtml(formatFiscalYearLabel(fiscalYear))}${fiscalYear.is_current ? "（現在年度）" : ""}
                            </option>
                          `
                        )
                        .join("")
                    : '<option value="">年度データ未登録</option>'
                }
              </select>
            </div>
          </form>
          ${
            years.length
              ? ""
              : '<p class="empty-state">FiscalYears が未登録のため、表示対象の年度を決められません。年度を登録すると M4 で切替表示できます。</p>'
          }
          <div class="basic-info-tabs" role="tablist" aria-label="基本情報セクション">
            ${sections
              .map(
                (section) => `
                  <button class="basic-info-tab ${section.key === activeTab ? "is-active" : ""}" type="button" data-info-tab="${escapeHtml(section.key)}" aria-pressed="${section.key === activeTab ? "true" : "false"}">
                    ${escapeHtml(section.label)}
                  </button>
                `
              )
              .join("")}
          </div>
          <div class="stack">
            ${sections.map((section) => renderBasicInfoSection(section, section.key === activeTab)).join("")}
          </div>
        </div>
      </section>
    </section>
  `;
}

function bindBasicInfoInteractions() {
  const fiscalYearSelect = document.getElementById("basic-info-fiscal-year");
  const tabButtons = Array.from(document.querySelectorAll("[data-info-tab]"));
  const panels = Array.from(document.querySelectorAll("[data-info-panel]"));

  if (fiscalYearSelect) {
    fiscalYearSelect.addEventListener("change", () => {
      const nextUrl = new URL(window.location.href);
      const selectedFiscalYearId = String(fiscalYearSelect.value || "").trim();

      if (selectedFiscalYearId) {
        nextUrl.searchParams.set("fiscalYearId", selectedFiscalYearId);
      } else {
        nextUrl.searchParams.delete("fiscalYearId");
      }

      window.location.assign(nextUrl.pathname + nextUrl.search);
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedTab = button.dataset.infoTab || "";

      tabButtons.forEach((candidate) => {
        const isActive = candidate.dataset.infoTab === selectedTab;
        candidate.classList.toggle("is-active", isActive);
        candidate.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.infoPanel === selectedTab;
        panel.classList.toggle("is-active", isActive);
        panel.hidden = !isActive;
      });
    });
  });
}

async function renderBasicInfoRoute() {
  const selectedFiscalYearId = new URLSearchParams(window.location.search).get("fiscalYearId") || "";

  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">基本情報</h1>
        <p class="page-description">年度ごとの事業計画・理念・会則・年間スケジュール</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body">
          <div class="loading-state"><div class="spinner"></div><p>読み込み中...</p></div>
        </div>
      </section>
    </section>
  `);

  try {
    const fiscalYears = await apiRequest("list-fiscal-years");
    const effectiveFiscalYearId = selectedFiscalYearId || fiscalYears.current_fiscal_year_id || "";
    const query = effectiveFiscalYearId
      ? `get-member-basic-info?fiscalYearId=${encodeURIComponent(effectiveFiscalYearId)}`
      : "get-member-basic-info";
    const result = await apiRequest(query);

    setView(renderBasicInfoPage(
      {
        fiscal_years: fiscalYears.years || result.fiscal_years || [],
        selected_fiscal_year: result.selected_fiscal_year,
        sections: result.sections || []
      },
      result.sections?.[0]?.key || "business_plan"
    ));
    bindBasicInfoInteractions();
  } catch (error) {
    setView(`
      <section class="admin-shell">
        <div class="page-header">
          <h1 class="page-title">基本情報</h1>
          <p class="page-description">年度ごとの事業計画・理念・会則・年間スケジュール</p>
        </div>
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <p class="message error">${escapeHtml(error.message || "基本情報の取得に失敗しました。")}</p>
            <div class="actions">
              <a class="text-link" href="/directory">名簿閲覧へ</a>
              <a class="text-link" href="/mypage">マイページへ</a>
            </div>
          </div>
        </section>
      </section>
    `);
  }
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${FUNCTION_BASE}/${path}`, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Request failed");
  }

  return data;
}

function getApplicationDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(APPLICATION_DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveApplicationDraft(draft) {
  sessionStorage.setItem(APPLICATION_DRAFT_KEY, JSON.stringify(draft));
}

function clearApplicationDraft() {
  sessionStorage.removeItem(APPLICATION_DRAFT_KEY);
  setApplicationProfileImage(null);
}

function setApplicationProfileImage(file) {
  if (applicationProfileImagePreviewUrl) {
    URL.revokeObjectURL(applicationProfileImagePreviewUrl);
    applicationProfileImagePreviewUrl = "";
  }

  applicationProfileImageFile = file instanceof File ? file : null;

  if (applicationProfileImageFile && applicationProfileImageFile.type.startsWith("image/")) {
    applicationProfileImagePreviewUrl = URL.createObjectURL(applicationProfileImageFile);
  }
}

function getApplicationProfileImage() {
  return applicationProfileImageFile;
}

function getApplicationProfileImagePreviewUrl() {
  return applicationProfileImagePreviewUrl;
}

function profileImageHasAllowedType(file) {
  if (!(file instanceof File)) {
    return false;
  }

  const lowerName = file.name.toLowerCase();
  return (
    PROFILE_IMAGE_ACCEPTED_TYPES.includes(file.type) ||
    PROFILE_IMAGE_ACCEPTED_EXTENSIONS.some((extension) => lowerName.endsWith(extension))
  );
}

function validateProfileImageFile(file) {
  if (!(file instanceof File) || file.size === 0) {
    return "";
  }

  if (!profileImageHasAllowedType(file)) {
    return "プロフィール画像は JPG / JPEG / PNG のみアップロードできます。";
  }

  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return "プロフィール画像は 5MB 以下にしてください。";
  }

  return "";
}

function buildApplicationMultipartPayload(draft) {
  const formData = new FormData();
  const fieldNames = [
    "name_kanji",
    "name_kana",
    "birthday",
    "company_name",
    "company_position",
    "industry",
    "company_postal_code",
    "company_address",
    "company_phone",
    "company_fax",
    "company_pr",
    "email",
    "mobile_phone",
    "home_postal_code",
    "home_address",
    "home_phone",
    "home_fax",
    "hobbies",
    "referrer_1",
    "referrer_2"
  ];

  fieldNames.forEach((key) => {
    const value = key === "company_name"
      ? String(draft[key] || "").trim() || "未設定"
      : String(draft[key] || "");
    formData.set(key, value);
  });

  formData.set("show_company_in_directory", "false");
  formData.set("show_email_in_directory", draft.show_email_in_directory ? "true" : "false");
  formData.set("show_mobile_in_directory", draft.show_mobile_in_directory ? "true" : "false");

  const file = getApplicationProfileImage();
  if (file) {
    formData.set("profile_image", file, file.name);
  }

  return formData;
}

function applicationValue(draft, key) {
  return escapeHtml(String(draft?.[key] || ""));
}

function applicationChecked(draft, key) {
  return draft?.[key] === true ? "checked" : "";
}

function applicationError(errors, key) {
  return errors?.[key]
    ? `<p class="field-error">${escapeHtml(errors[key])}</p>`
    : "";
}

function applicationSummaryItem(label, value) {
  return `
    <div class="summary-item">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(displayValue(value))}</dd>
    </div>
  `;
}

function normalizeApplicationDraft(form) {
  const file = form.querySelector('[name="profile_image"]')?.files?.[0];
  if (file) {
    setApplicationProfileImage(file);
  }

  const currentFile = getApplicationProfileImage();
  const previousDraft = getApplicationDraft();

  return {
    name_kanji: String(form.name_kanji.value || "").trim(),
    name_kana: String(form.name_kana.value || "").trim(),
    birthday: String(form.birthday.value || "").trim(),
    company_name: String(form.company_name.value || "").trim(),
    company_position: String(form.company_position.value || "").trim(),
    industry: String(form.industry.value || "").trim(),
    company_postal_code: String(form.company_postal_code.value || "").trim(),
    company_address: String(form.company_address.value || "").trim(),
    company_phone: String(form.company_phone.value || "").trim(),
    company_fax: String(form.company_fax.value || "").trim(),
    company_pr: String(form.company_pr.value || "").trim(),
    show_company_in_directory: false,
    email: String(form.email.value || "").trim(),
    show_email_in_directory: form.show_email_in_directory.checked,
    mobile_phone: String(form.mobile_phone.value || "").trim(),
    show_mobile_in_directory: form.show_mobile_in_directory.checked,
    home_postal_code: String(form.home_postal_code.value || "").trim(),
    home_address: String(form.home_address.value || "").trim(),
    home_phone: String(form.home_phone.value || "").trim(),
    home_fax: String(form.home_fax.value || "").trim(),
    hobbies: String(form.hobbies.value || "").trim(),
    referrer_1: String(form.referrer_1.value || "").trim(),
    referrer_2: String(form.referrer_2.value || "").trim(),
    profile_image: currentFile?.name || previousDraft.profile_image || ""
  };
}

function validateApplicationDraft(draft) {
  const errors = {};
  const requiredFields = [
    ["name_kanji", "氏名を入力してください。"],
    ["name_kana", "氏名（ふりがな）を入力してください。"],
    ["birthday", "生年月日を入力してください。"],
    ["email", "メールアドレスを入力してください。"],
    ["mobile_phone", "携帯番号を入力してください。"],
    ["referrer_1", "紹介者1を入力してください。"],
    ["referrer_2", "紹介者2を入力してください。"]
  ];

  requiredFields.forEach(([key, message]) => {
    if (!draft[key]) {
      errors[key] = message;
    }
  });

  if (draft.email && !draft.email.includes("@")) {
    errors.email = "メールアドレスの形式を確認してください。";
  }

  const profileImageError = validateProfileImageFile(getApplicationProfileImage());
  if (profileImageError) {
    errors.profile_image = profileImageError;
  }

  return errors;
}

function renderPublicHome() {
  setView(`
    <section class="landing-page">
      <div class="landing-hero">
        <h1 class="landing-title">水戸21の会</h1>
        <p class="landing-subtitle">会員管理システム</p>
      </div>
      <div class="landing-cards">
        <a class="landing-card" href="/apply">
          <div class="landing-card-icon" aria-hidden="true">&#128203;</div>
          <h2>入会申込</h2>
          <p>新規入会をご希望の方はこちらから申込できます</p>
        </a>
        <a class="landing-card" href="/directory">
          <div class="landing-card-icon" aria-hidden="true">&#128101;</div>
          <h2>会員ページ</h2>
          <p>会員名簿・基本情報・組織図・マニュアルを閲覧</p>
        </a>
        <a class="landing-card" href="/admin/dashboard">
          <div class="landing-card-icon" aria-hidden="true">&#9881;</div>
          <h2>管理画面</h2>
          <p>管理者向けのダッシュボードと各種管理機能</p>
        </a>
      </div>
    </section>
  `);
}

function renderApplicationFormPage(draft = {}, errors = {}, formMessage = "") {
  const profileImagePreviewUrl = getApplicationProfileImagePreviewUrl();
  const hasProfileImage = Boolean(getApplicationProfileImage());

  setView(`
    <section class="application-layout stack">
      <div class="page-header">
        <h1 class="page-title">入会申込</h1>
        <p class="page-description">必要事項を入力し、確認後に送信してください</p>
      </div>

      <form id="application-form" class="application-form stack" novalidate>
        <section class="detail-card application-section stack">
          <div class="panel-heading compact"><div><h2>基本情報</h2></div></div>
          <div class="editor-grid">
            <div class="field">
              <div class="label-row"><label for="name_kanji">氏名</label><span class="required">必須</span></div>
              <input id="name_kanji" name="name_kanji" type="text" autocomplete="name" placeholder="例: 水戸 太郎" value="${applicationValue(draft, "name_kanji")}" />
              ${applicationError(errors, "name_kanji")}
            </div>
            <div class="field">
              <div class="label-row"><label for="name_kana">氏名（ふりがな）</label><span class="required">必須</span></div>
              <input id="name_kana" name="name_kana" type="text" placeholder="例: みと たろう" value="${applicationValue(draft, "name_kana")}" />
              ${applicationError(errors, "name_kana")}
            </div>
            <div class="field field-compact">
              <div class="label-row"><label for="birthday">生年月日</label><span class="required">必須</span></div>
              <div class="date-input-wrap">
                <input id="birthday" class="date-input" name="birthday" type="date" value="${applicationValue(draft, "birthday")}" />
              </div>
              <p class="field-help">カレンダーから選択できます。</p>
              ${applicationError(errors, "birthday")}
            </div>
            <div class="field">
              <div class="label-row"><label for="profile_image">プロフィール画像</label><span class="pill">任意</span></div>
              <input id="profile_image" name="profile_image" type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" />
              <p class="muted">JPG / JPEG / PNG、5MB 以下。確認画面でファイル名を表示し、そのまま申込時に保存します。</p>
              <p class="upload-note">再読み込みすると画像は再選択が必要です。</p>
              ${applicationError(errors, "profile_image")}
              ${hasProfileImage ? `<p class="selected-file">選択中: ${escapeHtml(draft.profile_image || "未選択")}</p>` : ""}
              ${profileImagePreviewUrl ? `
                <div class="application-image-preview">
                  <img src="${escapeHtml(profileImagePreviewUrl)}" alt="プロフィール画像プレビュー" />
                </div>
              ` : ""}
            </div>
          </div>
        </section>

        <section class="detail-card application-section stack">
          <div class="panel-heading compact"><div><h2>会社情報</h2></div></div>
          <p class="muted section-note">会社名は任意です。わかる範囲で入力してください。</p>
          <div class="editor-grid">
            <div class="field">
              <div class="label-row"><label for="company_name">会社名</label><span class="pill">任意</span></div>
              <input id="company_name" name="company_name" type="text" autocomplete="organization" placeholder="例: 株式会社MITO" value="${applicationValue(draft, "company_name")}" />
              ${applicationError(errors, "company_name")}
            </div>
            <div class="field">
              <div class="label-row"><label for="company_position">役職名</label><span class="pill">任意</span></div>
              <input id="company_position" name="company_position" type="text" placeholder="例: 代表取締役" value="${applicationValue(draft, "company_position")}" />
            </div>
            <div class="field">
              <div class="label-row"><label for="industry">業種</label><span class="pill">任意</span></div>
              <input id="industry" name="industry" type="text" placeholder="例: 建設業" value="${applicationValue(draft, "industry")}" />
            </div>
            <div class="field">
              <div class="label-row"><label for="company_postal_code">会社郵便番号</label><span class="pill">任意</span></div>
              <input id="company_postal_code" name="company_postal_code" type="text" inputmode="numeric" placeholder="例: 310-0001" value="${applicationValue(draft, "company_postal_code")}" />
            </div>
            <div class="field field-span-2">
              <div class="label-row"><label for="company_address">会社住所</label><span class="pill">任意</span></div>
              <input id="company_address" name="company_address" type="text" placeholder="例: 茨城県水戸市..." value="${applicationValue(draft, "company_address")}" />
            </div>
            <div class="field">
              <div class="label-row"><label for="company_phone">会社電話番号</label><span class="pill">任意</span></div>
              <input id="company_phone" name="company_phone" type="tel" placeholder="例: 029-000-0000" value="${applicationValue(draft, "company_phone")}" />
            </div>
            <div class="field">
              <div class="label-row"><label for="company_fax">会社FAX</label><span class="pill">任意</span></div>
              <input id="company_fax" name="company_fax" type="tel" placeholder="例: 029-000-0001" value="${applicationValue(draft, "company_fax")}" />
            </div>
            <div class="field field-span-2">
              <div class="label-row"><label for="company_pr">会社の概要・PR</label><span class="pill">任意</span></div>
              <textarea id="company_pr" name="company_pr" rows="4" placeholder="事業内容や特徴を入力してください。">${applicationValue(draft, "company_pr")}</textarea>
            </div>
          </div>
        </section>

        <section class="detail-card application-section application-section-contacts stack">
          <div class="panel-heading compact"><div><h2>個人連絡先</h2></div></div>
          <div class="contact-pair-grid">
            <div class="contact-field">
              <div class="field">
                <div class="label-row"><label for="email">メールアドレス</label><span class="required">必須</span></div>
                <input id="email" name="email" type="email" autocomplete="email" placeholder="例: member@example.com" value="${applicationValue(draft, "email")}" />
                ${applicationError(errors, "email")}
              </div>
              <label class="checkbox-row checkbox-row-compact">
                <input name="show_email_in_directory" type="checkbox" ${applicationChecked(draft, "show_email_in_directory")} />
                <span>メールを名簿に掲載してよい</span>
              </label>
            </div>
            <div class="contact-field">
              <div class="field">
                <div class="label-row"><label for="mobile_phone">携帯番号</label><span class="required">必須</span></div>
                <input id="mobile_phone" name="mobile_phone" type="tel" autocomplete="tel" placeholder="例: 090-1234-5678" value="${applicationValue(draft, "mobile_phone")}" />
                ${applicationError(errors, "mobile_phone")}
              </div>
              <label class="checkbox-row checkbox-row-compact">
                <input name="show_mobile_in_directory" type="checkbox" ${applicationChecked(draft, "show_mobile_in_directory")} />
                <span>携帯番号を名簿に掲載してよい</span>
              </label>
            </div>
          </div>
        </section>

        <section class="detail-card application-section stack">
          <div class="panel-heading compact"><div><h2>自宅情報</h2></div></div>
          <div class="editor-grid">
            <div class="field">
              <div class="label-row"><label for="home_postal_code">自宅郵便番号</label><span class="pill">任意</span></div>
              <input id="home_postal_code" name="home_postal_code" type="text" inputmode="numeric" placeholder="例: 310-0002" value="${applicationValue(draft, "home_postal_code")}" />
            </div>
            <div class="field field-span-2">
              <div class="label-row"><label for="home_address">自宅住所</label><span class="pill">任意</span></div>
              <input id="home_address" name="home_address" type="text" placeholder="例: 茨城県水戸市..." value="${applicationValue(draft, "home_address")}" />
            </div>
            <div class="field">
              <div class="label-row"><label for="home_phone">自宅電話番号</label><span class="pill">任意</span></div>
              <input id="home_phone" name="home_phone" type="tel" placeholder="例: 029-111-1111" value="${applicationValue(draft, "home_phone")}" />
            </div>
            <div class="field">
              <div class="label-row"><label for="home_fax">自宅FAX</label><span class="pill">任意</span></div>
              <input id="home_fax" name="home_fax" type="tel" placeholder="例: 029-111-1112" value="${applicationValue(draft, "home_fax")}" />
            </div>
          </div>
        </section>

        <section class="detail-card application-section stack">
          <div class="panel-heading compact"><div><h2>その他</h2></div></div>
          <div class="editor-grid">
            <div class="field field-span-2">
              <div class="label-row"><label for="hobbies">趣味・信条</label><span class="pill">任意</span></div>
              <textarea id="hobbies" name="hobbies" rows="4" placeholder="例: ゴルフ、地域活動、読書">${applicationValue(draft, "hobbies")}</textarea>
            </div>
            <div class="field">
              <div class="label-row"><label for="referrer_1">紹介者1</label><span class="required">必須</span></div>
              <input id="referrer_1" name="referrer_1" type="text" placeholder="例: 紹介 太郎" value="${applicationValue(draft, "referrer_1")}" />
              ${applicationError(errors, "referrer_1")}
            </div>
            <div class="field">
              <div class="label-row"><label for="referrer_2">紹介者2</label><span class="required">必須</span></div>
              <input id="referrer_2" name="referrer_2" type="text" placeholder="例: 紹介 花子" value="${applicationValue(draft, "referrer_2")}" />
              ${applicationError(errors, "referrer_2")}
            </div>
          </div>
        </section>

        <section class="detail-card application-section application-section-actions stack-sm">
          <p id="application-form-message" class="message ${formMessage ? "error" : ""}" aria-live="polite">${escapeHtml(formMessage)}</p>
          <div class="actions application-actions">
            <button class="button" type="submit">確認画面へ進む</button>
            <a class="text-link subtle-link" href="/">公開トップ</a>
          </div>
        </section>
      </form>
    </section>
  `);

  const form = document.getElementById("application-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const draft = normalizeApplicationDraft(form);
    const errors = validateApplicationDraft(draft);

    if (Object.keys(errors).length) {
      renderApplicationFormPage(draft, errors, "入力内容を確認してください。");
      return;
    }

    saveApplicationDraft(draft);
    window.location.assign("/apply/confirm");
  });
}

function renderApplicationConfirmPage(draft) {
  const profileImagePreviewUrl = getApplicationProfileImagePreviewUrl();

  if (!draft.name_kanji) {
    setView(`
      <section class="card">
        <div class="card-body stack">
          <p class="message error">確認する申込内容がありません。先に入力画面から進んでください。</p>
          <div class="actions">
            <a class="button" href="/apply">入会申込へ</a>
            <a class="button ghost" href="/">公開トップへ</a>
          </div>
        </div>
      </section>
    `);
    return;
  }

  setView(`
    <section class="application-layout stack">
      <div class="page-header">
        <h1 class="page-title">申込内容の確認</h1>
        <p class="page-description">入力内容を確認して送信してください</p>
      </div>

      <section class="detail-card application-section application-confirm-card stack">
        <div class="panel-heading compact"><div><h2>確認内容</h2></div></div>
        <p class="upload-note">再読み込みすると画像は再選択が必要です。</p>
        ${profileImagePreviewUrl ? `
          <div class="application-image-preview confirm">
            <img src="${escapeHtml(profileImagePreviewUrl)}" alt="プロフィール画像プレビュー" />
          </div>
        ` : ""}
        <dl class="summary-grid application-summary-grid">
          ${applicationSummaryItem("氏名", draft.name_kanji)}
          ${applicationSummaryItem("氏名（ふりがな）", draft.name_kana)}
          ${applicationSummaryItem("生年月日", draft.birthday)}
          ${applicationSummaryItem("プロフィール画像", draft.profile_image || "未選択")}
          ${applicationSummaryItem("会社名", draft.company_name || "未入力")}
          ${applicationSummaryItem("役職名", draft.company_position)}
          ${applicationSummaryItem("業種", draft.industry)}
          ${applicationSummaryItem("会社郵便番号", draft.company_postal_code)}
          ${applicationSummaryItem("会社住所", draft.company_address)}
          ${applicationSummaryItem("会社電話番号", draft.company_phone)}
          ${applicationSummaryItem("会社FAX", draft.company_fax)}
          ${applicationSummaryItem("会社の概要・PR", draft.company_pr)}
          ${applicationSummaryItem("メールアドレス", draft.email)}
          ${applicationSummaryItem("メール公開", draft.show_email_in_directory)}
          ${applicationSummaryItem("携帯番号", draft.mobile_phone)}
          ${applicationSummaryItem("携帯番号公開", draft.show_mobile_in_directory)}
          ${applicationSummaryItem("自宅郵便番号", draft.home_postal_code)}
          ${applicationSummaryItem("自宅住所", draft.home_address)}
          ${applicationSummaryItem("自宅電話番号", draft.home_phone)}
          ${applicationSummaryItem("自宅FAX", draft.home_fax)}
          ${applicationSummaryItem("趣味・信条", draft.hobbies)}
          ${applicationSummaryItem("紹介者1", draft.referrer_1)}
          ${applicationSummaryItem("紹介者2", draft.referrer_2)}
        </dl>
      </section>

      <section class="detail-card application-section application-section-actions stack-sm">
        <p id="application-confirm-message" class="message" aria-live="polite"></p>
        <div class="actions application-actions">
          <button id="application-confirm-submit" class="button" type="button">この内容で送信する</button>
          <a class="text-link subtle-link" href="/apply">入力画面</a>
        </div>
      </section>
    </section>
  `);

  const submitButton = document.getElementById("application-confirm-submit");
  const message = document.getElementById("application-confirm-message");
  submitButton.addEventListener("click", async () => {
    submitButton.disabled = true;
    submitButton.textContent = "送信中...";
    message.className = "message";
    message.textContent = "";

    try {
      await apiRequest("register-member", {
        method: "POST",
        body: buildApplicationMultipartPayload(draft)
      });
      clearApplicationDraft();
      window.location.assign("/apply/complete");
    } catch (error) {
      message.className = "message error";
      message.textContent =
        error.message === "Email already exists"
          ? "このメールアドレスでの申込はすでに受付けています。"
          : error.message || "申込の送信に失敗しました。";
      submitButton.disabled = false;
      submitButton.textContent = "この内容で送信する";
    }
  });
}

function renderApplicationCompletePage() {
  setView(`
    <section class="application-layout stack">
      <div class="page-header">
        <h1 class="page-title">申込を受け付けました</h1>
        <p class="page-description">内容を確認のうえ、承認後にご連絡いたします</p>
      </div>

      <section class="detail-card stack-sm">
        <p class="message success">受付処理は完了しました。必要な連絡がある場合のみ、後日ご案内します。</p>
        <div class="actions application-actions">
          <a class="button" href="/">公開トップ</a>
          <a class="button ghost" href="/apply">新規申込</a>
          <a class="text-link subtle-link" href="/directory">名簿</a>
        </div>
      </section>
    </section>
  `);
}

function renderApplyFormRoute() {
  renderApplicationFormPage(getApplicationDraft());
}

function renderApplyConfirmRoute() {
  renderApplicationConfirmPage(getApplicationDraft());
}

function renderApplyCompleteRoute() {
  renderApplicationCompletePage();
}

function renderPendingList(members, selectedId) {
  if (!members.length) {
    return '<p class="empty-state">申請中の申込はありません。</p>';
  }

  return `
    <div class="pending-list stack-sm">
      ${members
        .map((member) => {
          const isSelected = member.id === selectedId;
          return `
            <button class="pending-item ${isSelected ? "is-selected" : ""}" data-member-id="${escapeHtml(member.id)}" type="button">
              <span class="pending-date">${escapeHtml(member.applied_at || "-")}</span>
              <strong>${escapeHtml(member.name_kanji)}</strong>
              <span>${escapeHtml(member.company_name || "-")}</span>
              <span>${escapeHtml(member.referrer_1 || "-")} / ${escapeHtml(member.referrer_2 || "-")}</span>
              <span class="pill">${escapeHtml(member.approval_status || "-")}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderReferrerMatchList(label, matches) {
  if (!matches.length) {
    return `
      <div class="info-block">
        <strong>${escapeHtml(label)}</strong>
        <p class="muted">一致する既存会員は見つかりませんでした。</p>
      </div>
    `;
  }

  return `
    <div class="info-block">
      <strong>${escapeHtml(label)}</strong>
      <ul class="match-list">
        ${matches
          .map(
            (match) => `
              <li>
                <span>${escapeHtml(match.name_kanji)}</span>
                <span>${escapeHtml(match.member_number || "会員番号未設定")}</span>
                <span>${escapeHtml(match.member_type || "種別未設定")}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </div>
  `;
}

function renderMemberDetail(detail) {
  if (!detail) {
    return '<p class="empty-state">左の一覧から申込を選択してください。</p>';
  }

  const { member, referrer_matches: referrerMatches } = detail;

  return `
    <div class="detail-stack">
      <section class="detail-card stack-sm">
        <div class="detail-header-row">
          <div>

            <h2>${escapeHtml(member.name_kanji)}</h2>
          </div>
          <span class="pill">${escapeHtml(member.approval_status)}</span>
        </div>
        <dl class="detail-grid">
          <div><dt>申込日</dt><dd>${escapeHtml(member.applied_at || "-")}</dd></div>
          <div><dt>氏名（ふりがな）</dt><dd>${escapeHtml(member.name_kana || "-")}</dd></div>
          <div><dt>生年月日</dt><dd>${escapeHtml(member.birthday || "-")}</dd></div>
          <div><dt>会社名</dt><dd>${escapeHtml(member.company_name || "-")}</dd></div>
          <div><dt>メール</dt><dd>${escapeHtml(member.email || "-")}</dd></div>
          <div><dt>携帯番号</dt><dd>${escapeHtml(member.mobile_phone || "-")}</dd></div>
          <div><dt>紹介者1</dt><dd>${escapeHtml(member.referrer_1 || "-")}</dd></div>
          <div><dt>紹介者2</dt><dd>${escapeHtml(member.referrer_2 || "-")}</dd></div>
        </dl>
      </section>

      <section class="detail-card stack-sm">
        <div class="detail-header-row">
          <div>

            <h3>紹介者照合</h3>
          </div>
        </div>
        ${renderReferrerMatchList("紹介者1", referrerMatches.referrer_1 || [])}
        ${renderReferrerMatchList("紹介者2", referrerMatches.referrer_2 || [])}
      </section>

      <section class="detail-card stack">
        <div class="detail-header-row">
          <div>

            <h3>承認 / 却下</h3>
          </div>
          
        </div>
        <form id="approve-form" class="stack-sm" novalidate>
          <input type="hidden" name="id" value="${escapeHtml(member.id)}" />
          <div class="field">
            <label for="member_type">会員種別</label>
            <select id="member_type" name="member_type">
              <option value="正会員">正会員</option>
              <option value="賛助会員">賛助会員</option>
            </select>
          </div>
          <div class="field">
            <label for="member_number">会員番号</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input id="member_number" name="member_number" type="text" placeholder="自動採番中..." style="flex:1" />
              <button id="auto-number-btn" class="button ghost" type="button" style="white-space:nowrap">自動採番</button>
            </div>
            <span id="auto-number-hint" class="muted" style="font-size:12px"></span>
          </div>
          <button class="button" type="submit">承認する</button>
        </form>

        <form id="reject-form" class="stack-sm" novalidate>
          <input type="hidden" name="id" value="${escapeHtml(member.id)}" />
          <div class="field">
            <label for="rejection_reason">却下理由</label>
            <textarea id="rejection_reason" name="rejection_reason" rows="4" placeholder="却下理由を入力"></textarea>
          </div>
          <button class="button secondary" type="submit">却下する</button>
        </form>
        <p id="admin-message" class="message" aria-live="polite"></p>
      </section>
    </div>
  `;
}

function renderMemberRows(members) {
  if (!members.length) {
    return '<p class="empty-state">条件に一致する会員はいません。</p>';
  }

  return `
    <div class="members-table-wrap">
      <table class="members-table">
        <thead>
          <tr>
            <th>番号</th>
            <th>氏名</th>
            <th>会社名</th>
            <th>委員会・役職</th>
            <th>会員種別</th>
            <th>ステータス</th>
            <th>メール</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${members
            .map(
              (member) => {
                const assigns = member.org_assignments || [];
                const orgText = assigns.map((a) => `${a.org_name}${a.role ? "/" + a.role : ""}`).join(", ");
                return `
                <tr class="table-row-link" onclick="window.location.href='/admin/members/${escapeHtml(member.id)}'" style="cursor:pointer">
                  <td>${escapeHtml(member.member_number || "-")}</td>
                  <td><strong>${escapeHtml(member.name_kanji || "-")}</strong></td>
                  <td>${escapeHtml(member.company_name || "-")}</td>
                  <td>${escapeHtml(orgText || "-")}</td>
                  <td><span class="pill">${escapeHtml(member.member_type || "-")}</span></td>
                  <td>${escapeHtml(member.status || "-")}</td>
                  <td>${escapeHtml(member.email || "-")}</td>
                  <td><a class="text-link" href="/admin/members/${escapeHtml(member.id)}">詳細</a></td>
                </tr>
              `;
              }
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderDirectoryCards(members) {
  if (!members.length) {
    return '<p class="empty-state">表示できる会員はいません。</p>';
  }

  return `
    <div class="directory-grid">
      ${members
        .map(
          (member) => {
            const assigns = member.org_assignments || [];
            const orgText = assigns.map((a) => `${a.org_name}${a.role ? " / " + a.role : ""}`).join("、");
            return `
            <article class="directory-card">
              <div class="directory-card-header">
                ${renderMemberImage(member.profile_image, member.name_kanji, "thumb")}
                <div>
                  <h3>${escapeHtml(displayValue(member.name_kanji))}</h3>
                  ${orgText ? `<p class="muted" style="font-size:0.85em;margin:2px 0 0">${escapeHtml(orgText)}</p>` : ""}
                </div>
                <span class="pill">${escapeHtml(displayValue(member.member_type))}</span>
              </div>
              <dl class="directory-meta">
                ${member.company_name ? `<div><dt>会社名</dt><dd>${escapeHtml(member.company_name)}${member.company_position ? " / " + escapeHtml(member.company_position) : ""}</dd></div>` : ""}
                ${member.email ? `<div><dt>メール</dt><dd>${escapeHtml(member.email)}</dd></div>` : ""}
                ${member.mobile_phone ? `<div><dt>携帯番号</dt><dd>${escapeHtml(member.mobile_phone)}</dd></div>` : ""}
              </dl>
              <div class="actions">
                <a class="text-link" href="/directory/members/${escapeHtml(member.id)}">詳細を見る</a>
              </div>
            </article>
          `;
          }
        )
        .join("")}
    </div>
  `;
}

function renderDirectoryMemberDetailCard(member) {
  const assigns = member.org_assignments || [];
  const orgText = assigns.map((a) => `${a.org_name}${a.role ? " / " + a.role : ""}`).join("、");
  const joinYear = member.join_date ? member.join_date.slice(0, 4) + "年" : "";

  return `
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">会員詳細</h1>
        <p class="page-description">公開設定に応じた会員情報を表示</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body stack">
          <div class="panel-heading">
            <div><h2>${escapeHtml(displayValue(member.name_kanji))}</h2></div>
            <span class="pill">${escapeHtml(displayValue(member.member_type))}</span>
          </div>
          <section class="detail-card stack-sm">
            <div class="member-image-wrap">
              ${renderMemberImage(member.profile_image, member.name_kanji, "detail")}
            </div>
            <dl class="detail-grid">
              <div><dt>氏名</dt><dd>${escapeHtml(displayValue(member.name_kanji))}</dd></div>
              ${orgText ? `<div><dt>委員会・役職</dt><dd>${escapeHtml(orgText)}</dd></div>` : ""}
              <div><dt>生年月日</dt><dd>${escapeHtml(displayValue(member.birthday))}</dd></div>
              ${joinYear ? `<div><dt>入会年</dt><dd>${escapeHtml(joinYear)}</dd></div>` : ""}
              <div><dt>会員種別</dt><dd>${escapeHtml(displayValue(member.member_type))}</dd></div>
              ${member.company_name ? `<div><dt>会社名</dt><dd>${escapeHtml(member.company_name)}</dd></div>` : ""}
              ${member.company_position ? `<div><dt>役職</dt><dd>${escapeHtml(member.company_position)}</dd></div>` : ""}
              ${member.company_postal_code ? `<div><dt>会社郵便番号</dt><dd>${escapeHtml(member.company_postal_code)}</dd></div>` : ""}
              ${member.company_address ? `<div><dt>会社住所</dt><dd>${escapeHtml(member.company_address)}</dd></div>` : ""}
              ${member.company_phone ? `<div><dt>会社電話</dt><dd>${escapeHtml(member.company_phone)}</dd></div>` : ""}
              ${member.company_fax ? `<div><dt>会社FAX</dt><dd>${escapeHtml(member.company_fax)}</dd></div>` : ""}
              ${member.industry ? `<div><dt>業種</dt><dd>${escapeHtml(member.industry)}</dd></div>` : ""}
              ${member.email ? `<div><dt>メール</dt><dd>${escapeHtml(member.email)}</dd></div>` : ""}
              ${member.mobile_phone ? `<div><dt>携帯番号</dt><dd>${escapeHtml(member.mobile_phone)}</dd></div>` : ""}
            </dl>
          </section>
          <div class="actions">
            <a class="text-link subtle-link" href="/directory">名簿</a>
            <a class="text-link subtle-link" href="/organization">組織図</a>
          </div>
        </div>
      </section>
    </section>
  `;
}

async function renderDirectoryMemberDetail(memberId) {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">会員詳細</h1>
        <p class="page-description">公開設定に応じた会員情報を表示</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body">
          <div class="loading-state"><div class="spinner"></div><p>読み込み中...</p></div>
        </div>
      </section>
    </section>
  `);

  try {
    const result = await apiRequest(
      `get-directory-member-detail?id=${encodeURIComponent(memberId)}`
    );
    setView(renderDirectoryMemberDetailCard(result.member));
  } catch (error) {
    setView(`
      <section class="admin-shell">
        <div class="page-header">
          <h1 class="page-title">会員詳細</h1>
          <p class="page-description">公開設定に応じた会員情報を表示</p>
        </div>
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <p class="message error">${escapeHtml(error.message || "会員情報の取得に失敗しました。")}</p>
            <div class="actions">
              <a class="text-link" href="/directory">名簿閲覧へ戻る</a>
            </div>
          </div>
        </section>
      </section>
    `);
  }
}

async function renderDirectoryMembers() {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">名簿閲覧</h1>
        <p class="page-description">承認済・活動中の会員名簿を閲覧</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body stack">
          <form id="directory-search-form" class="filter-grid directory-filter" novalidate>
            <div class="field field-span-2">
              <label for="directory-search">検索</label>
              <input id="directory-search" name="q" type="text" placeholder="氏名 / フリガナ / 公開中の会社名" />
            </div>
            <div class="field">
              <label for="directory-org-filter">委員会</label>
              <select id="directory-org-filter" name="organization_id">
                <option value="">すべて</option>
              </select>
            </div>
            <div class="filter-actions">
              <button class="button" type="submit">検索する</button>
              <button id="directory-reset" class="button ghost" type="button">リセット</button>
            </div>
          </form>
          <div class="panel-heading compact"><p id="directory-message" class="message" aria-live="polite"></p></div>
          <div id="directory-list-slot"></div>
        </div>
      </section>
    </section>
  `);

  const form = document.getElementById("directory-search-form");
  const resetButton = document.getElementById("directory-reset");
  const listSlot = document.getElementById("directory-list-slot");
  const message = document.getElementById("directory-message");
  const orgSelect = document.getElementById("directory-org-filter");

  async function loadMembers() {
    const params = new URLSearchParams();
    const formData = new FormData(form);
    const query = String(formData.get("q") || "").trim();
    const orgId = String(formData.get("organization_id") || "").trim();

    if (query) params.set("q", query);
    if (orgId) params.set("organization_id", orgId);

    message.className = "message";
    message.textContent = "読み込み中...";

    try {
      const result = await apiRequest(
        params.toString() ? `list-directory-members?${params.toString()}` : "list-directory-members"
      );
      const members = result.members || [];
      const orgOptions = result.org_options || [];

      // Populate org filter if not already done
      if (orgSelect && orgSelect.options.length <= 1 && orgOptions.length > 0) {
        for (const opt of orgOptions) {
          const option = document.createElement("option");
          option.value = opt.id;
          option.textContent = opt.name;
          orgSelect.appendChild(option);
        }
      }

      listSlot.innerHTML = renderDirectoryCards(members);
      message.textContent = `${members.length}件を表示中 / 対象: 承認済・活動中 / 並び順: 氏名昇順`;
    } catch (error) {
      listSlot.innerHTML = '<p class="empty-state">名簿を表示できませんでした。</p>';
      message.className = "message error";
      message.textContent = error.message || "名簿の取得に失敗しました。";
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadMembers();
  });

  resetButton.addEventListener("click", async () => {
    form.reset();
    await loadMembers();
  });

  await loadMembers();
}
function renderMyPage(member, flashMessage = "") {
  return `
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">マイページ</h1>
        <p class="page-description">自分の情報と名簿公開設定を管理</p>
      </div>
      <div class="admin-grid admin-grid-wide">
        <section class="card panel-card">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>自分の情報</h2></div></div>
            <section class="detail-card stack-sm">
              <div class="detail-header-row">
                <div>

                  <h3>${escapeHtml(displayValue(member.name_kanji))}</h3>
                </div>
                <div class="pill-row">
                  <span class="pill">${escapeHtml(displayValue(member.member_type))}</span>
                  <span class="pill">${escapeHtml(displayValue(member.status))}</span>
                </div>
              </div>
              <div class="member-image-wrap">
                ${renderMemberImage(member.profile_image, member.name_kanji, "detail")}
              </div>
              <dl class="detail-grid">
                <div><dt>氏名</dt><dd>${escapeHtml(displayValue(member.name_kanji))}</dd></div>
                <div><dt>フリガナ</dt><dd>${escapeHtml(displayValue(member.name_kana))}</dd></div>
                <div><dt>会社名</dt><dd>${escapeHtml(displayValue(member.company_name))}</dd></div>
                <div><dt>役職</dt><dd>${escapeHtml(displayValue(member.company_position))}</dd></div>
                <div><dt>業種</dt><dd>${escapeHtml(displayValue(member.industry))}</dd></div>
                <div><dt>メール</dt><dd>${escapeHtml(displayValue(member.email))}</dd></div>
                <div><dt>携帯番号</dt><dd>${escapeHtml(displayValue(member.mobile_phone))}</dd></div>
                <div><dt>会社電話</dt><dd>${escapeHtml(displayValue(member.company_phone))}</dd></div>
                <div><dt>会社FAX</dt><dd>${escapeHtml(displayValue(member.company_fax))}</dd></div>
                <div><dt>会社住所</dt><dd>${escapeHtml(displayValue(member.company_address))}</dd></div>
                <div><dt>会員番号</dt><dd>${escapeHtml(displayValue(member.member_number))}</dd></div>
                <div><dt>会員種別</dt><dd>${escapeHtml(displayValue(member.member_type))}</dd></div>
                <div><dt>ステータス</dt><dd>${escapeHtml(displayValue(normalizeMemberStatus(member.status)))}</dd></div>
              </dl>
            </section>
          </div>
        </section>

        <section class="card panel-card">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>プロフィール編集</h2></div></div>
            <p class="muted">名簿に出るのは公開フラグをオンにした項目です。氏名・フリガナ・生年月日・会員番号は管理者のみ変更可能です。</p>
            <form id="mypage-form" class="editor-form" novalidate>
              <input type="hidden" name="id" value="${escapeHtml(member.id)}" />
              <h4 style="margin:0.5rem 0 0.25rem">個人連絡先</h4>
              <div class="editor-grid">
                <div class="field"><label for="mypage-email">メール</label><input id="mypage-email" name="email" type="email" value="${escapeHtml(member.email || "")}" /></div>
                <div class="field"><label for="mypage-mobile-phone">携帯番号</label><input id="mypage-mobile-phone" name="mobile_phone" type="tel" value="${escapeHtml(member.mobile_phone || "")}" /></div>
              </div>
              <h4 style="margin:0.5rem 0 0.25rem">会社情報</h4>
              <div class="editor-grid">
                <div class="field"><label for="mypage-company-name">会社名</label><input id="mypage-company-name" name="company_name" type="text" value="${escapeHtml(member.company_name || "")}" /></div>
                <div class="field"><label for="mypage-company-position">役職</label><input id="mypage-company-position" name="company_position" type="text" value="${escapeHtml(member.company_position || "")}" /></div>
                <div class="field"><label for="mypage-industry">業種</label><input id="mypage-industry" name="industry" type="text" value="${escapeHtml(member.industry || "")}" /></div>
                <div class="field"><label for="mypage-company-postal-code">会社郵便番号</label><input id="mypage-company-postal-code" name="company_postal_code" type="text" value="${escapeHtml(member.company_postal_code || "")}" /></div>
                <div class="field field-span-2"><label for="mypage-company-address">会社住所</label><textarea id="mypage-company-address" name="company_address" rows="2">${escapeHtml(member.company_address || "")}</textarea></div>
                <div class="field"><label for="mypage-company-phone">会社電話</label><input id="mypage-company-phone" name="company_phone" type="tel" value="${escapeHtml(member.company_phone || "")}" /></div>
                <div class="field"><label for="mypage-company-fax">会社FAX</label><input id="mypage-company-fax" name="company_fax" type="tel" value="${escapeHtml(member.company_fax || "")}" /></div>
                <div class="field field-span-2"><label for="mypage-company-pr">会社PR</label><textarea id="mypage-company-pr" name="company_pr" rows="2">${escapeHtml(member.company_pr || "")}</textarea></div>
              </div>
              <h4 style="margin:0.5rem 0 0.25rem">自宅情報</h4>
              <div class="editor-grid">
                <div class="field"><label for="mypage-home-postal-code">自宅郵便番号</label><input id="mypage-home-postal-code" name="home_postal_code" type="text" value="${escapeHtml(member.home_postal_code || "")}" /></div>
                <div class="field field-span-2"><label for="mypage-home-address">自宅住所</label><textarea id="mypage-home-address" name="home_address" rows="2">${escapeHtml(member.home_address || "")}</textarea></div>
                <div class="field"><label for="mypage-home-phone">自宅電話</label><input id="mypage-home-phone" name="home_phone" type="tel" value="${escapeHtml(member.home_phone || "")}" /></div>
                <div class="field"><label for="mypage-home-fax">自宅FAX</label><input id="mypage-home-fax" name="home_fax" type="tel" value="${escapeHtml(member.home_fax || "")}" /></div>
              </div>
              <h4 style="margin:0.5rem 0 0.25rem">その他</h4>
              <div class="editor-grid">
                <div class="field field-span-2"><label for="mypage-hobbies">趣味・信条</label><textarea id="mypage-hobbies" name="hobbies" rows="2">${escapeHtml(member.hobbies || "")}</textarea></div>
              </div>
              <section class="detail-card stack-sm inset-card">
                <div><h3>名簿公開設定</h3></div>
                <label class="checkbox-row"><input name="show_email_in_directory" type="checkbox" ${isChecked(member.show_email_in_directory)} /><span>メールを名簿に公開する</span></label>
                <label class="checkbox-row"><input name="show_company_in_directory" type="checkbox" ${isChecked(member.show_company_in_directory)} /><span>会社情報を名簿に公開する</span></label>
                <label class="checkbox-row"><input name="show_mobile_in_directory" type="checkbox" ${isChecked(member.show_mobile_in_directory)} /><span>携帯番号を名簿に公開する</span></label>
              </section>
              <p id="mypage-message" class="message ${flashMessage ? "success" : ""}" aria-live="polite">${escapeHtml(flashMessage)}</p>
              <div class="actions"><button id="mypage-submit" class="button" type="submit">保存する</button></div>
            </form>
          </div>
        </section>
      </div>
    </section>
  `;
}

async function renderMyPageRoute() {
  const memberId = new URLSearchParams(window.location.search).get("memberId") || "";

  if (!memberId) {
    setView(`
      <section class="admin-shell">
        <div class="page-header">
          <h1 class="page-title">マイページ</h1>
          <p class="page-description">自分の情報と名簿公開設定を管理</p>
        </div>
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <p class="message">例: <code>/mypage?memberId=YOUR_MEMBER_ID</code></p>
            <div class="actions">
              <a class="text-link" href="/directory">名簿閲覧へ</a>
              <a class="text-link" href="/info">基本情報へ</a>
              <a class="text-link" href="/organization">組織図へ</a>
              <a class="text-link" href="/manual">運用マニュアルへ</a>
            </div>
          </div>
        </section>
      </section>
    `);
    return;
  }

  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">マイページ</h1>
        <p class="page-description">自分の情報と名簿公開設定を管理</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body">
          <div class="loading-state"><div class="spinner"></div><p>読み込み中...</p></div>
        </div>
      </section>
    `);

  try {
    const result = await apiRequest(
      `get-my-member-detail?memberId=${encodeURIComponent(memberId)}`
    );
    const flashMessage = sessionStorage.getItem("mypage-message") || "";
    sessionStorage.removeItem("mypage-message");
    setView(renderMyPage(result.member, flashMessage));
    bindMyPageForm(memberId, result.member);
  } catch (error) {
    setView(`
      <section class="admin-shell">
        <div class="page-header">
          <h1 class="page-title">マイページ</h1>
          <p class="page-description">自分の情報と名簿公開設定を管理</p>
        </div>
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <p class="message error">${escapeHtml(error.message || "会員情報の取得に失敗しました。")}</p>
            <div class="actions">
              <a class="text-link" href="/directory">名簿閲覧へ</a>
              <a class="text-link" href="/info">基本情報へ</a>
              <a class="text-link" href="/organization">組織図へ</a>
              <a class="text-link" href="/manual">運用マニュアルへ</a>
            </div>
          </div>
        </section>
      </section>
    `);
  }
}

function bindMyPageForm(memberId, member) {
  const form = document.getElementById("mypage-form");
  const message = document.getElementById("mypage-message");
  const submitButton = document.getElementById("mypage-submit");

  if (!form || !message || !submitButton) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.className = "message";
    message.textContent = "";

    const formData = new FormData(form);
    const payload = {
      id: member.id,
      allow_partial_profile_update: true,
      changed_by: member.name_kanji || "会員",
      changed_by_role: "member",
      email: String(formData.get("email") || "").trim(),
      mobile_phone: String(formData.get("mobile_phone") || "").trim(),
      company_name: String(formData.get("company_name") || "").trim(),
      company_position: String(formData.get("company_position") || "").trim(),
      industry: String(formData.get("industry") || "").trim(),
      company_postal_code: String(formData.get("company_postal_code") || "").trim(),
      company_address: String(formData.get("company_address") || "").trim(),
      company_phone: String(formData.get("company_phone") || "").trim(),
      company_fax: String(formData.get("company_fax") || "").trim(),
      company_pr: String(formData.get("company_pr") || "").trim(),
      home_postal_code: String(formData.get("home_postal_code") || "").trim(),
      home_address: String(formData.get("home_address") || "").trim(),
      home_phone: String(formData.get("home_phone") || "").trim(),
      home_fax: String(formData.get("home_fax") || "").trim(),
      hobbies: String(formData.get("hobbies") || "").trim(),
      show_email_in_directory: form.querySelector('[name="show_email_in_directory"]').checked,
      show_company_in_directory: form.querySelector('[name="show_company_in_directory"]').checked,
      show_mobile_in_directory: form.querySelector('[name="show_mobile_in_directory"]').checked
    };

    if (!payload.email) {
      message.textContent = "メールを入力してください。";
      message.classList.add("error");
      return;
    }

    if (!payload.email.includes("@")) {
      message.textContent = "メールアドレスの形式を確認してください。";
      message.classList.add("error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "保存中...";

    try {
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      sessionStorage.setItem("mypage-message", "保存しました。");
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set("memberId", memberId);
      window.location.assign(nextUrl.pathname + nextUrl.search);
    } catch (error) {
      if (error.message === "Email already exists") {
        message.textContent = "このメールアドレスは別の申込または会員ですでに使われています。";
      } else {
        message.textContent = error.message || "保存に失敗しました。";
      }
      message.classList.add("error");
      submitButton.disabled = false;
      submitButton.textContent = "保存する";
    }
  });
}
function renderMemberEditor(detail, flashMessage = "", historyData = null, changeLogs = null) {
  const { member, referrer_matches: referrerMatches } = detail;
  const orgHistory = historyData?.org_history || [];
  const duesHistory = historyData?.dues_history || [];
  const logs = changeLogs || [];

  const FIELD_LABELS = {
    name_kanji: "氏名", name_kana: "フリガナ", birthday: "生年月日",
    company_name: "会社名", company_position: "役職", industry: "業種",
    email: "メール", mobile_phone: "携帯番号", company_phone: "会社電話",
    company_fax: "会社FAX", company_address: "会社住所", company_postal_code: "会社郵便番号",
    company_pr: "会社PR", home_postal_code: "自宅郵便番号", home_address: "自宅住所",
    home_phone: "自宅電話", home_fax: "自宅FAX", hobbies: "趣味・信条",
    profile_image: "プロフィール画像", show_email_in_directory: "メール公開",
    show_company_in_directory: "会社公開", show_mobile_in_directory: "携帯公開",
    member_number: "会員番号", member_type: "会員種別", status: "ステータス",
    is_new: "新入フラグ", notes: "備考"
  };

  return `
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">会員詳細・編集</h1>
        <p class="page-description">会員情報の確認と更新</p>
        <div class="actions"><a class="text-link subtle-link" href="/admin/members">会員一覧</a></div>
      </div>
      <div class="tab-bar" id="member-detail-tabs">
        <button class="tab-button is-active" data-tab="tab-basic">基本情報</button>
        <button class="tab-button" data-tab="tab-org-history">組織履歴</button>
        <button class="tab-button" data-tab="tab-dues-history">会費履歴</button>
        <button class="tab-button" data-tab="tab-directory">名簿設定</button>
        <button class="tab-button" data-tab="tab-change-log">変更履歴</button>
      </div>

      <div id="tab-basic" class="tab-panel is-active">
        <div class="admin-grid admin-grid-wide">
          <section class="card panel-card">
            <div class="card-body stack">
              <div class="panel-heading"><div><h2>会員詳細</h2></div></div>
              <section class="detail-card stack-sm">
                <div class="detail-header-row">
                  <div><h3>${escapeHtml(displayValue(member.name_kanji))}</h3></div>
                  <div class="pill-row">
                    <span class="pill">${escapeHtml(displayValue(member.approval_status))}</span>
                    <span class="pill">${escapeHtml(displayValue(member.status))}</span>
                  </div>
                </div>
                <dl class="detail-grid">
                  <div><dt>氏名</dt><dd>${escapeHtml(displayValue(member.name_kanji))}</dd></div>
                  <div><dt>フリガナ</dt><dd>${escapeHtml(displayValue(member.name_kana))}</dd></div>
                  <div><dt>生年月日</dt><dd>${escapeHtml(displayValue(member.birthday))}</dd></div>
                  <div><dt>会社名</dt><dd>${escapeHtml(displayValue(member.company_name))}</dd></div>
                  <div><dt>役職</dt><dd>${escapeHtml(displayValue(member.company_position))}</dd></div>
                  <div><dt>業種</dt><dd>${escapeHtml(displayValue(member.industry))}</dd></div>
                  <div><dt>メール</dt><dd>${escapeHtml(displayValue(member.email))}</dd></div>
                  <div><dt>携帯番号</dt><dd>${escapeHtml(displayValue(member.mobile_phone))}</dd></div>
                  <div><dt>会社電話</dt><dd>${escapeHtml(displayValue(member.company_phone))}</dd></div>
                  <div><dt>会社FAX</dt><dd>${escapeHtml(displayValue(member.company_fax))}</dd></div>
                  <div><dt>会社郵便番号</dt><dd>${escapeHtml(displayValue(member.company_postal_code))}</dd></div>
                  <div><dt>会社住所</dt><dd>${escapeHtml(displayValue(member.company_address))}</dd></div>
                  <div><dt>会社PR</dt><dd>${escapeHtml(displayValue(member.company_pr))}</dd></div>
                  <div><dt>自宅郵便番号</dt><dd>${escapeHtml(displayValue(member.home_postal_code))}</dd></div>
                  <div><dt>自宅住所</dt><dd>${escapeHtml(displayValue(member.home_address))}</dd></div>
                  <div><dt>自宅電話</dt><dd>${escapeHtml(displayValue(member.home_phone))}</dd></div>
                  <div><dt>自宅FAX</dt><dd>${escapeHtml(displayValue(member.home_fax))}</dd></div>
                  <div><dt>趣味・信条</dt><dd>${escapeHtml(displayValue(member.hobbies))}</dd></div>
                  <div><dt>会員番号</dt><dd>${escapeHtml(displayValue(member.member_number))}</dd></div>
                  <div><dt>会員種別</dt><dd>${escapeHtml(displayValue(member.member_type))}</dd></div>
                  <div><dt>承認状態</dt><dd>${escapeHtml(displayValue(member.approval_status))}</dd></div>
                  <div><dt>入会日</dt><dd>${escapeHtml(displayValue(member.join_date))}</dd></div>
                  <div><dt>新規フラグ</dt><dd>${escapeHtml(displayValue(member.is_new))}</dd></div>
                  <div><dt>備考</dt><dd>${escapeHtml(displayValue(member.notes))}</dd></div>
                </dl>
              </section>
              <section class="detail-card stack-sm">
                <div class="detail-header-row"><div><h3>紹介者照合</h3></div></div>
                ${renderReferrerMatchList("紹介者1", referrerMatches.referrer_1 || [])}
                ${renderReferrerMatchList("紹介者2", referrerMatches.referrer_2 || [])}
              </section>
            </div>
          </section>

          <section class="card panel-card">
            <div class="card-body stack">
              <div class="panel-heading"><div><h2>編集</h2></div></div>
              <form id="member-edit-form" class="editor-form" novalidate>
                <input type="hidden" name="id" value="${escapeHtml(member.id)}" />
                <div class="editor-grid">
                  <div class="field"><label for="edit-name-kanji">氏名</label><input id="edit-name-kanji" name="name_kanji" type="text" value="${escapeHtml(member.name_kanji || "")}" /></div>
                  <div class="field"><label for="edit-name-kana">フリガナ</label><input id="edit-name-kana" name="name_kana" type="text" value="${escapeHtml(member.name_kana || "")}" /></div>
                  <div class="field"><label for="edit-birthday">生年月日</label><input id="edit-birthday" name="birthday" type="date" value="${escapeHtml(member.birthday || "")}" /></div>
                  <div class="field"><label for="edit-company-name">会社名</label><input id="edit-company-name" name="company_name" type="text" value="${escapeHtml(member.company_name || "")}" /></div>
                  <div class="field"><label for="edit-company-position">役職</label><input id="edit-company-position" name="company_position" type="text" value="${escapeHtml(member.company_position || "")}" /></div>
                  <div class="field"><label for="edit-industry">業種</label><input id="edit-industry" name="industry" type="text" value="${escapeHtml(member.industry || "")}" /></div>
                  <div class="field"><label for="edit-email">メール</label><input id="edit-email" name="email" type="email" value="${escapeHtml(member.email || "")}" /></div>
                  <div class="field"><label for="edit-mobile-phone">携帯番号</label><input id="edit-mobile-phone" name="mobile_phone" type="tel" value="${escapeHtml(member.mobile_phone || "")}" /></div>
                  <div class="field"><label for="edit-company-phone">会社電話</label><input id="edit-company-phone" name="company_phone" type="tel" value="${escapeHtml(member.company_phone || "")}" /></div>
                  <div class="field"><label for="edit-company-fax">会社FAX</label><input id="edit-company-fax" name="company_fax" type="tel" value="${escapeHtml(member.company_fax || "")}" /></div>
                  <div class="field"><label for="edit-company-postal-code">会社郵便番号</label><input id="edit-company-postal-code" name="company_postal_code" type="text" value="${escapeHtml(member.company_postal_code || "")}" /></div>
                  <div class="field field-span-2"><label for="edit-company-address">会社住所</label><textarea id="edit-company-address" name="company_address" rows="2">${escapeHtml(member.company_address || "")}</textarea></div>
                  <div class="field field-span-2"><label for="edit-company-pr">会社PR</label><textarea id="edit-company-pr" name="company_pr" rows="2">${escapeHtml(member.company_pr || "")}</textarea></div>
                  <div class="field"><label for="edit-home-postal-code">自宅郵便番号</label><input id="edit-home-postal-code" name="home_postal_code" type="text" value="${escapeHtml(member.home_postal_code || "")}" /></div>
                  <div class="field field-span-2"><label for="edit-home-address">自宅住所</label><textarea id="edit-home-address" name="home_address" rows="2">${escapeHtml(member.home_address || "")}</textarea></div>
                  <div class="field"><label for="edit-home-phone">自宅電話</label><input id="edit-home-phone" name="home_phone" type="tel" value="${escapeHtml(member.home_phone || "")}" /></div>
                  <div class="field"><label for="edit-home-fax">自宅FAX</label><input id="edit-home-fax" name="home_fax" type="tel" value="${escapeHtml(member.home_fax || "")}" /></div>
                  <div class="field field-span-2"><label for="edit-hobbies">趣味・信条</label><textarea id="edit-hobbies" name="hobbies" rows="2">${escapeHtml(member.hobbies || "")}</textarea></div>
                  <div class="field"><label for="edit-member-number">会員番号</label><input id="edit-member-number" name="member_number" type="text" value="${escapeHtml(member.member_number || "")}" /></div>
                  <div class="field"><label for="edit-member-type">会員種別</label>
                    <select id="edit-member-type" name="member_type">
                      <option value="">未設定</option>
                      <option value="正会員" ${member.member_type === "正会員" ? "selected" : ""}>正会員</option>
                      <option value="賛助会員" ${member.member_type === "賛助会員" ? "selected" : ""}>賛助会員</option>
                      <option value="OB会員" ${member.member_type === "OB会員" ? "selected" : ""}>OB会員</option>
                    </select>
                  </div>
                  <div class="field"><label for="edit-status">ステータス</label>
                    <select id="edit-status" name="status">
                      <option value="">未設定</option>
                      <option value="活動中" ${member.status === "活動中" ? "selected" : ""}>活動中</option>
                      <option value="休会" ${member.status === "休会" ? "selected" : ""}>休会</option>
                      <option value="退会" ${member.status === "退会" ? "selected" : ""}>退会</option>
                    </select>
                  </div>
                  <div class="field field-span-2"><label for="edit-notes">備考（管理者用）</label><textarea id="edit-notes" name="notes" rows="2">${escapeHtml(member.notes || "")}</textarea></div>
                </div>
                <p id="member-edit-message" class="message ${flashMessage ? "success" : ""}" aria-live="polite">${escapeHtml(flashMessage)}</p>
                <div class="actions"><button id="member-edit-submit" class="button" type="submit">保存する</button></div>
              </form>
            </div>
          </section>
        </div>
      </div>

      <div id="tab-org-history" class="tab-panel">
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>組織履歴</h2></div></div>
            ${orgHistory.length ? orgHistory.map((fy) => `
              <section class="detail-card stack-sm">
                <div class="detail-header-row">
                  <div><h3>${escapeHtml(String(fy.year))}年度${fy.is_current ? " (現在)" : ""}</h3></div>
                </div>
                <dl class="detail-grid">
                  ${fy.assignments.map((a) => `<div><dt>${escapeHtml(a.org_name)}</dt><dd>${escapeHtml(a.role || "-")}</dd></div>`).join("")}
                </dl>
              </section>
            `).join("") : '<p class="empty-state">組織配属の履歴はありません。</p>'}
          </div>
        </section>
      </div>

      <div id="tab-dues-history" class="tab-panel">
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>会費履歴</h2></div></div>
            ${duesHistory.length ? `
              <div class="members-table-wrap">
                <table class="members-table">
                  <thead><tr><th>年度</th><th>金額</th><th>状態</th><th>入金日</th><th>備考</th></tr></thead>
                  <tbody>
                    ${duesHistory.map((d) => `
                      <tr>
                        <td>${escapeHtml(String(d.year))}年度</td>
                        <td>${escapeHtml(d.amount ? d.amount.toLocaleString() + "円" : "-")}</td>
                        <td><span class="pill ${d.status === "納入済" ? "pill-success" : ""}">${escapeHtml(d.status)}</span></td>
                        <td>${escapeHtml(displayValue(d.paid_date))}</td>
                        <td>${escapeHtml(displayValue(d.notes))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : '<p class="empty-state">会費の履歴はありません。</p>'}
          </div>
        </section>
      </div>

      <div id="tab-directory" class="tab-panel">
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>名簿掲載設定</h2></div></div>
            <form id="member-directory-form" class="editor-form" novalidate>
              <input type="hidden" name="id" value="${escapeHtml(member.id)}" />
              <section class="detail-card stack-sm inset-card">
                <label class="checkbox-row"><input name="show_email_in_directory" type="checkbox" ${isChecked(member.show_email_in_directory)} /><span>メールを名簿掲載する</span></label>
                <label class="checkbox-row"><input name="show_company_in_directory" type="checkbox" ${isChecked(member.show_company_in_directory)} /><span>会社情報を名簿掲載する</span></label>
                <label class="checkbox-row"><input name="show_mobile_in_directory" type="checkbox" ${isChecked(member.show_mobile_in_directory)} /><span>携帯番号を名簿掲載する</span></label>
              </section>
              <p id="member-directory-message" class="message" aria-live="polite"></p>
              <div class="actions"><button id="member-directory-submit" class="button" type="submit">名簿設定を保存</button></div>
            </form>
          </div>
        </section>
      </div>

      <div id="tab-change-log" class="tab-panel">
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>変更履歴</h2></div></div>
            ${logs.length ? `
              <div class="members-table-wrap">
                <table class="members-table">
                  <thead><tr><th>日時</th><th>変更者</th><th>項目</th><th>変更前</th><th>変更後</th></tr></thead>
                  <tbody>
                    ${logs.map((log) => `
                      <tr>
                        <td>${escapeHtml(log.changed_at ? new Date(log.changed_at).toLocaleString("ja-JP") : "-")}</td>
                        <td>${escapeHtml(log.changed_by)} (${escapeHtml(log.changed_by_role)})</td>
                        <td>${escapeHtml(FIELD_LABELS[log.field_name] || log.field_name)}</td>
                        <td>${escapeHtml(displayValue(log.old_value))}</td>
                        <td>${escapeHtml(displayValue(log.new_value))}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
              </div>
            ` : '<p class="empty-state">変更履歴はありません。</p>'}
          </div>
        </section>
      </div>
    </section>
  `;
}

async function renderAdminMemberDetail(memberId) {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">会員詳細・編集</h1>
        <p class="page-description">会員情報の確認と更新</p>
        <div class="actions"><a class="text-link subtle-link" href="/admin/members">会員一覧</a></div>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body">
          <div class="loading-state"><div class="spinner"></div><p>読み込み中...</p></div>
        </div>
      </section>
    </section>
  `);

  try {
    const [detail, historyResult, changeLogResult] = await Promise.all([
      apiRequest(`get-member-detail?id=${encodeURIComponent(memberId)}`),
      apiRequest(`get-member-history?memberId=${encodeURIComponent(memberId)}`).catch(() => ({ org_history: [], dues_history: [] })),
      apiRequest(`get-member-change-logs?memberId=${encodeURIComponent(memberId)}`).catch(() => ({ logs: [] }))
    ]);
    const flashMessage = sessionStorage.getItem("member-edit-message") || "";
    sessionStorage.removeItem("member-edit-message");
    setView(renderMemberEditor(detail, flashMessage, historyResult, changeLogResult.logs));
    bindMemberEditForm(memberId);
    bindMemberDetailTabs();
    bindMemberDirectoryForm(memberId);
  } catch (error) {
    setView(`
      <section class="admin-shell">
        <div class="page-header">
          <h1 class="page-title">会員詳細・編集</h1>
          <p class="page-description">会員情報の確認と更新</p>
          <div class="actions"><a class="text-link subtle-link" href="/admin/members">会員一覧</a></div>
        </div>
        <section class="card panel-card single-panel">
          <div class="card-body stack">
            <p class="message error">${escapeHtml(error.message || "会員情報の取得に失敗しました。")}</p>
          </div>
        </section>
      </section>
    `);
  }
}

function bindMemberDetailTabs() {
  const tabBar = document.getElementById("member-detail-tabs");
  if (!tabBar) return;
  tabBar.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBar.querySelectorAll(".tab-button").forEach((b) => b.classList.remove("is-active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      const panel = document.getElementById(btn.dataset.tab);
      if (panel) panel.classList.add("is-active");
    });
  });
}

function bindMemberDirectoryForm(memberId) {
  const form = document.getElementById("member-directory-form");
  const message = document.getElementById("member-directory-message");
  const submitButton = document.getElementById("member-directory-submit");
  if (!form || !message || !submitButton) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.className = "message";
    message.textContent = "";
    submitButton.disabled = true;
    submitButton.textContent = "保存中...";
    try {
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: String(new FormData(form).get("id") || ""),
          allow_partial_profile_update: true,
          show_email_in_directory: form.querySelector('[name="show_email_in_directory"]').checked,
          show_company_in_directory: form.querySelector('[name="show_company_in_directory"]').checked,
          show_mobile_in_directory: form.querySelector('[name="show_mobile_in_directory"]').checked,
          changed_by: "admin",
          changed_by_role: "admin"
        })
      });
      message.textContent = "名簿設定を保存しました。";
      message.classList.add("success");
      submitButton.disabled = false;
      submitButton.textContent = "名簿設定を保存";
    } catch (error) {
      message.textContent = error.message || "保存に失敗しました。";
      message.classList.add("error");
      submitButton.disabled = false;
      submitButton.textContent = "名簿設定を保存";
    }
  });
}

function bindMemberEditForm(memberId) {
  const form = document.getElementById("member-edit-form");
  const message = document.getElementById("member-edit-message");
  const submitButton = document.getElementById("member-edit-submit");

  if (!form || !message || !submitButton) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.className = "message";
    message.textContent = "";

    const formData = new FormData(form);
    const payload = {
      id: String(formData.get("id") || ""),
      name_kanji: String(formData.get("name_kanji") || "").trim(),
      name_kana: String(formData.get("name_kana") || "").trim(),
      birthday: String(formData.get("birthday") || "").trim(),
      company_name: String(formData.get("company_name") || "").trim(),
      company_position: String(formData.get("company_position") || "").trim(),
      industry: String(formData.get("industry") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      mobile_phone: String(formData.get("mobile_phone") || "").trim(),
      company_phone: String(formData.get("company_phone") || "").trim(),
      company_fax: String(formData.get("company_fax") || "").trim(),
      company_postal_code: String(formData.get("company_postal_code") || "").trim(),
      company_address: String(formData.get("company_address") || "").trim(),
      company_pr: String(formData.get("company_pr") || "").trim(),
      home_postal_code: String(formData.get("home_postal_code") || "").trim(),
      home_address: String(formData.get("home_address") || "").trim(),
      home_phone: String(formData.get("home_phone") || "").trim(),
      home_fax: String(formData.get("home_fax") || "").trim(),
      hobbies: String(formData.get("hobbies") || "").trim(),
      member_number: String(formData.get("member_number") || "").trim(),
      member_type: String(formData.get("member_type") || "").trim(),
      status: normalizeMemberStatus(formData.get("status")),
      notes: String(formData.get("notes") || "").trim(),
      changed_by: "admin",
      changed_by_role: "admin"
    };

    const requiredFields = [
      [payload.name_kanji, "氏名"],
      [payload.name_kana, "フリガナ"],
      [payload.birthday, "生年月日"],
      [payload.email, "メール"],
      [payload.mobile_phone, "携帯番号"]
    ];

    for (const [value, label] of requiredFields) {
      if (!value) {
        message.textContent = `${label}を入力してください。`;
        message.classList.add("error");
        return;
      }
    }

    if (!payload.email.includes("@")) {
      message.textContent = "メールアドレスの形式を確認してください。";
      message.classList.add("error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "保存中...";

    try {
      await apiRequest("update-member-detail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      sessionStorage.setItem("member-edit-message", "保存しました。");
      await renderAdminMemberDetail(memberId);
    } catch (error) {
      if (error.message === "Email already exists") {
        message.textContent = "このメールアドレスは別の申込または会員ですでに使われています。";
      } else if (error.message === "member_number already exists") {
        message.textContent = "この会員番号はすでに使われています。";
      } else {
        message.textContent = error.message || "保存に失敗しました。";
      }
      message.classList.add("error");
      submitButton.disabled = false;
      submitButton.textContent = "保存する";
    }
  });
}

async function renderAdminMembers() {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">会員一覧</h1>
        <p class="page-description">会員の検索・絞り込み・詳細確認</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body stack">
          <form id="members-filter-form" class="filter-grid" novalidate>
            <div class="field field-span-2">
              <label for="member-search">検索</label>
              <input id="member-search" name="q" type="text" placeholder="氏名 / フリガナ / 会社名 / email / 会員番号" />
            </div>
            <div class="field">
              <label for="status-filter">ステータス</label>
              <select id="status-filter" name="status">
                <option value="">すべて</option>
                <option value="活動中">活動中</option>
                <option value="休会">休会</option>
                <option value="退会">退会</option>
              </select>
            </div>
            <div class="field">
              <label for="member-type-filter">会員種別</label>
              <select id="member-type-filter" name="member_type">
                <option value="">すべて</option>
                <option value="正会員">正会員</option>
                <option value="賛助会員">賛助会員</option>
                <option value="OB会員">OB会員</option>
              </select>
            </div>
            <div class="field">
              <label for="approval-status-filter">承認状態</label>
              <select id="approval-status-filter" name="approval_status">
                <option value="">すべて</option>
                <option value="承認済">承認済</option>
                <option value="申請中">申請中</option>
                <option value="却下">却下</option>
              </select>
            </div>
            <div class="field">
              <label for="org-filter">委員会</label>
              <select id="org-filter" name="organization_id">
                <option value="">すべて</option>
              </select>
            </div>
            <div class="filter-actions">
              <button class="button" type="submit">絞り込む</button>
              <button id="members-reset" class="button ghost" type="button">リセット</button>
            </div>
          </form>
          <div class="panel-heading compact">
            <p id="members-message" class="message" aria-live="polite"></p>
          </div>
          <div id="members-list-slot"></div>
        </div>
      </section>
    </section>
  `);

  const form = document.getElementById("members-filter-form");
  const resetButton = document.getElementById("members-reset");
  const listSlot = document.getElementById("members-list-slot");
  const message = document.getElementById("members-message");

  async function loadMembers() {
    const params = new URLSearchParams();
    const formData = new FormData(form);

    for (const [key, value] of formData.entries()) {
      const normalizedValue = String(value || "").trim();
      if (normalizedValue) {
        params.set(key, normalizedValue);
      }
    }

    message.className = "message";
    message.textContent = "読み込み中...";

    try {
      const query = params.toString();
      const result = await apiRequest(
        query ? `list-members-admin?${query}` : "list-members-admin"
      );
      const members = result.members || [];
      const orgOptions = result.org_options || [];
      listSlot.innerHTML = renderMemberRows(members);

      // Populate org filter if available
      const orgFilterSelect = document.getElementById("org-filter");
      if (orgFilterSelect && orgFilterSelect.options.length <= 1 && orgOptions.length > 0) {
        for (const opt of orgOptions) {
          const option = document.createElement("option");
          option.value = opt.id;
          option.textContent = opt.name;
          orgFilterSelect.appendChild(option);
        }
      }

      message.textContent = `${members.length}件を表示中 / 並び順: 氏名昇順`;
    } catch (error) {
      listSlot.innerHTML = '<p class="empty-state">一覧を表示できませんでした。</p>';
      message.className = "message error";
      message.textContent = error.message || "会員一覧の取得に失敗しました。";
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadMembers();
  });

  resetButton.addEventListener("click", async () => {
    form.reset();
    await loadMembers();
  });

  await loadMembers();
}

function newsletterStatusLabel(status) {
  const map = { draft: "下書き", scheduled: "予約中", sent: "送信済", cancelled: "取消", failed: "失敗" };
  return map[status] || status || "-";
}

function newsletterStatusClass(status) {
  const map = { draft: "", scheduled: "pill-warning", sent: "pill-success", failed: "pill-danger", cancelled: "" };
  return map[status] || "";
}

function newsletterChannelIcon(channel) {
  if (channel === "line") return "LINE";
  if (channel === "email+line") return "Mail+LINE";
  return "Mail";
}

function audienceLabel(type) {
  const map = { all: "全員", member_type: "会員種別", status: "ステータス", approval_status: "承認状態" };
  return map[type] || type || "全員";
}

function renderNewsletterRows(newsletters, selectedId, statusFilter) {
  const filtered = statusFilter === "all" ? newsletters : newsletters.filter((n) => n.status === statusFilter);
  if (!filtered.length) {
    return `<div class="nl-empty-state"><p class="muted">${statusFilter === "all" ? "配信はまだありません。「新規作成」から始めましょう。" : "該当する配信はありません。"}</p></div>`;
  }

  return `
    <div class="nl-card-list">
      ${filtered
        .map(
          (newsletter) => `
            <button class="nl-card ${newsletter.id === selectedId ? "is-selected" : ""}" data-newsletter-id="${escapeHtml(newsletter.id)}" type="button">
              <div class="nl-card-header">
                <span class="pill ${newsletterStatusClass(newsletter.status)}">${escapeHtml(newsletterStatusLabel(newsletter.status))}</span>
                <span class="nl-channel-badge">${escapeHtml(newsletterChannelIcon(newsletter.channel))}</span>
              </div>
              <strong class="nl-card-title">${escapeHtml(displayValue(newsletter.title))}</strong>
              <div class="nl-card-meta">
                <span>${escapeHtml(audienceLabel(newsletter.audience_type))}</span>
                <span>${escapeHtml((newsletter.updated_at || newsletter.created_at || "").slice(0, 10))}</span>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

const ADMIN_DOCUMENT_TYPES = [
  "事業計画",
  "団体理念",
  "会則・規約",
  "年間スケジュール",
  "運用マニュアル"
];

const ADMIN_ORG_TYPES = ["役員会", "委員会", "部会", "その他"];

function createEmptyNewsletter() {
  return {
    id: "",
    title: "",
    body: "",
    channel: "email",
    status: "draft",
    audience_type: "all",
    audience_filter_json: "",
    scheduled_at: "",
    last_sent_at: "",
    error_message: "",
    attachment_info: "",
    attachments_json: "[]",
    updated_at: ""
  };
}

function parseNewsletterAttachments(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function renderNewsletterEditor(newsletter, flashMessage = "") {
  const current = newsletter || createEmptyNewsletter();
  const attachments = parseNewsletterAttachments(current.attachments_json);
  const primaryAttachment = attachments[0] || { name: "", url: "" };
  const isSent = current.status === "sent";
  const isReadonly = isSent;

  return `
    <div class="nl-detail-stack">
      <div class="nl-detail-header">
        <h2>${escapeHtml(current.id ? current.title || "無題の配信" : "新規配信作成")}</h2>
        ${current.id ? `<span class="pill ${newsletterStatusClass(current.status)}">${escapeHtml(newsletterStatusLabel(current.status))}</span>` : ""}
      </div>

      <form id="newsletter-form" class="nl-form" novalidate>
        <input type="hidden" name="id" value="${escapeHtml(current.id)}" />

        <div class="field nl-subject-field">
          <label for="newsletter-title">件名</label>
          <input id="newsletter-title" name="title" type="text" value="${escapeHtml(current.title)}" placeholder="配信の件名を入力..." class="nl-subject-input" ${isReadonly ? "readonly" : ""} />
        </div>

        <div class="field">
          <label for="newsletter-body">本文</label>
          <textarea id="newsletter-body" name="body" class="nl-body-textarea" placeholder="配信本文を入力..." ${isReadonly ? "readonly" : ""}>${escapeHtml(current.body)}</textarea>
        </div>

        <div class="nl-options-grid">
          <div class="nl-option-section">
            <label class="nl-option-label">配信チャネル</label>
            <div class="nl-channel-toggles">
              <label class="nl-toggle-btn ${current.channel === "email" || current.channel === "email+line" ? "active" : ""}">
                <input type="checkbox" name="channel_email" ${current.channel === "email" || current.channel === "email+line" ? "checked" : ""} ${isReadonly ? "disabled" : ""} />
                <span>&#9993; Mail</span>
              </label>
              <label class="nl-toggle-btn ${current.channel === "line" || current.channel === "email+line" ? "active" : ""}">
                <input type="checkbox" name="channel_line" ${current.channel === "line" || current.channel === "email+line" ? "checked" : ""} ${isReadonly ? "disabled" : ""} />
                <span>LINE</span>
              </label>
            </div>
            <input type="hidden" name="channel" value="${escapeHtml(current.channel || "email")}" />
          </div>

          <div class="nl-option-section">
            <label class="nl-option-label">配信対象</label>
            <div style="display:flex;gap:8px;align-items:center">
              <select id="newsletter-audience-type" name="audience_type" ${isReadonly ? "disabled" : ""}>
                <option value="all"${current.audience_type === "all" ? " selected" : ""}>全員</option>
                <option value="member_type"${current.audience_type === "member_type" ? " selected" : ""}>会員種別指定</option>
              </select>
              <span id="nl-audience-badge" class="pill pill-success" style="display:none"></span>
            </div>
            <select id="newsletter-audience-detail" name="audience_filter_value" style="display:none;margin-top:6px" ${isReadonly ? "disabled" : ""}>
              <option value="">選択してください</option>
              <option value="正会員"${current.audience_filter_json?.includes("正会員") ? " selected" : ""}>正会員のみ</option>
              <option value="賛助会員"${current.audience_filter_json?.includes("賛助会員") ? " selected" : ""}>賛助会員のみ</option>
            </select>
            <input type="hidden" name="audience_filter_json" value="${escapeHtml(current.audience_filter_json)}" />
          </div>

          <div class="nl-option-section">
            <label class="nl-option-label">予約送信</label>
            <input id="newsletter-scheduled-at" name="scheduled_at" type="datetime-local" value="${escapeHtml(current.scheduled_at || "")}" ${isReadonly ? "readonly" : ""} />
            <span class="muted" style="font-size:12px">空欄の場合は即時送信</span>
          </div>
        </div>

        <details class="nl-attachment-section" ${primaryAttachment.url ? "open" : ""}>
          <summary class="nl-option-label" style="cursor:pointer">添付ファイル</summary>
          <div class="nl-attachment-drop" style="margin-top:8px">
            <div class="editor-grid">
              <div class="field">
                <label for="newsletter-attachment-name">表示名</label>
                <input id="newsletter-attachment-name" name="attachment_name" type="text" value="${escapeHtml(primaryAttachment.name || "")}" placeholder="例: 2026年度案内PDF" ${isReadonly ? "readonly" : ""} />
              </div>
              <div class="field">
                <label for="newsletter-attachment-url">URL</label>
                <input id="newsletter-attachment-url" name="attachment_url" type="url" value="${escapeHtml(primaryAttachment.url || "")}" placeholder="https://..." ${isReadonly ? "readonly" : ""} />
              </div>
            </div>
          </div>
        </details>

        <input type="hidden" name="status" value="${escapeHtml(current.status || "draft")}" />
        <input type="hidden" name="attachment_info" value="${escapeHtml(current.attachment_info || "")}" />
        <input type="hidden" name="error_message" value="${escapeHtml(current.error_message || "")}" />

        ${current.id && current.last_sent_at ? `
          <div class="nl-sent-info">
            <span class="muted">送信日時: ${escapeHtml(current.last_sent_at)}</span>
          </div>
        ` : ""}

        <p id="newsletter-message" class="message ${flashMessage ? "success" : ""}" aria-live="polite">${escapeHtml(flashMessage)}</p>
        <p id="newsletter-preview-message" class="message" aria-live="polite"></p>

        <div class="nl-action-bar">
          ${!isReadonly ? `<button id="newsletter-save" class="button ghost" type="submit">下書き保存</button>` : ""}
          <button id="newsletter-preview" class="button ghost" type="button">プレビュー</button>
          ${current.id && !isSent ? `<button id="newsletter-send" class="button nl-send-btn" type="button">送信する</button>` : ""}
        </div>
      </form>
    </div>
  `;
}

async function renderAdminNewsletters(selectedId = "") {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">配信管理</h1>
        <p class="page-description">メール配信の作成・送信・履歴管理</p>
      </div>
      <div class="admin-grid admin-grid-wide">
        <section class="card panel-card nl-list-panel">
          <div class="card-body stack">
            <div class="panel-heading">
              <div><h2>配信一覧</h2></div>
              <button id="newsletter-create" class="button" type="button">+ 新規作成</button>
            </div>
            <div class="nl-status-tabs" id="nl-status-tabs">
              <button class="nl-tab active" data-filter="all" type="button">全て</button>
              <button class="nl-tab" data-filter="draft" type="button">下書き</button>
              <button class="nl-tab" data-filter="scheduled" type="button">予約中</button>
              <button class="nl-tab" data-filter="sent" type="button">送信済</button>
            </div>
            <div id="newsletter-list-slot" class="nl-list-slot"></div>
          </div>
        </section>
        <section class="card panel-card nl-detail-panel">
          <div class="card-body">
            <div id="newsletter-detail-slot"></div>
          </div>
        </section>
      </div>
    </section>
  `);

  const listSlot = document.getElementById("newsletter-list-slot");
  const detailSlot = document.getElementById("newsletter-detail-slot");
  const createButton = document.getElementById("newsletter-create");
  const statusTabs = document.getElementById("nl-status-tabs");

  let newsletters = [];
  let activeId = selectedId || "";
  let currentFilter = "all";

  function updateChannelHidden(form) {
    const emailCb = form.querySelector("[name=channel_email]");
    const lineCb = form.querySelector("[name=channel_line]");
    const channelInput = form.querySelector("[name=channel]");
    if (!emailCb || !lineCb || !channelInput) return;
    const e = emailCb.checked, l = lineCb.checked;
    channelInput.value = e && l ? "email+line" : l ? "line" : "email";
    emailCb.closest(".nl-toggle-btn").classList.toggle("active", e);
    lineCb.closest(".nl-toggle-btn").classList.toggle("active", l);
  }

  function updateAudienceUI(form) {
    const type = form.querySelector("[name=audience_type]")?.value || "all";
    const detailSelect = form.querySelector("#newsletter-audience-detail");
    const filterInput = form.querySelector("[name=audience_filter_json]");
    if (detailSelect) {
      detailSelect.style.display = type === "member_type" ? "" : "none";
    }
    if (type === "member_type" && detailSelect && filterInput) {
      const val = detailSelect.value;
      filterInput.value = val ? JSON.stringify({ member_type: val }) : "";
    } else if (type === "all" && filterInput) {
      filterInput.value = "";
    }
  }

  async function loadDetail(id) {
    const flashMessage = sessionStorage.getItem("newsletter-message") || "";
    sessionStorage.removeItem("newsletter-message");

    if (!id) {
      detailSlot.innerHTML = renderNewsletterEditor(createEmptyNewsletter(), flashMessage);
      bindNewsletterForm();
      return;
    }

    detailSlot.innerHTML = '<div class="nl-skeleton"><div class="skeleton-line"></div><div class="skeleton-line short"></div><div class="skeleton-block"></div></div>';

    try {
      const result = await apiRequest(`get-newsletter-detail?id=${encodeURIComponent(id)}`);
      detailSlot.innerHTML = renderNewsletterEditor(result.newsletter, flashMessage);
      bindNewsletterForm(result.newsletter.id);
    } catch (error) {
      detailSlot.innerHTML = `<p class="message error">${escapeHtml(error.message || "配信詳細の取得に失敗しました。")}</p>`;
    }
  }

  function renderList() {
    listSlot.innerHTML = renderNewsletterRows(newsletters, activeId, currentFilter);
    bindListActions();
  }

  function bindListActions() {
    listSlot.querySelectorAll("[data-newsletter-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        activeId = button.dataset.newsletterId || "";
        renderList();
        await loadDetail(activeId);
      });
    });
  }

  function bindNewsletterForm(currentId = "") {
    const form = document.getElementById("newsletter-form");
    const message = document.getElementById("newsletter-message");
    const previewMessage = document.getElementById("newsletter-preview-message");
    const saveButton = document.getElementById("newsletter-save");
    const previewButton = document.getElementById("newsletter-preview");

    if (!form || !previewMessage) return;

    // Channel toggle binding
    form.querySelectorAll("[name=channel_email],[name=channel_line]").forEach((cb) => {
      cb.addEventListener("change", () => updateChannelHidden(form));
    });

    // Audience type binding
    const audienceType = form.querySelector("[name=audience_type]");
    const audienceDetail = form.querySelector("#newsletter-audience-detail");
    if (audienceType) {
      audienceType.addEventListener("change", () => updateAudienceUI(form));
      updateAudienceUI(form);
    }
    if (audienceDetail) {
      audienceDetail.addEventListener("change", () => updateAudienceUI(form));
    }

    // Auto-resize textarea
    const bodyTextarea = form.querySelector("#newsletter-body");
    if (bodyTextarea) {
      function autoResize() {
        bodyTextarea.style.height = "auto";
        bodyTextarea.style.height = Math.max(200, bodyTextarea.scrollHeight) + "px";
      }
      bodyTextarea.addEventListener("input", autoResize);
      autoResize();
    }

    // Preview audience
    async function previewAudience() {
      previewMessage.className = "message";
      previewMessage.textContent = "";
      const formData = new FormData(form);
      const payload = {
        audience_type: String(formData.get("audience_type") || "all").trim(),
        audience_filter_json: String(formData.get("audience_filter_json") || "").trim()
      };

      previewButton.disabled = true;
      previewButton.textContent = "確認中...";
      try {
        const result = await apiRequest("preview-newsletter-audience", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const badge = document.getElementById("nl-audience-badge");
        if (badge) { badge.style.display = ""; badge.textContent = `${result.count}名`; }
        previewMessage.textContent = `対象: ${result.count}名（承認済・活動中）`;
        previewMessage.classList.add("success");
      } catch (error) {
        previewMessage.textContent = error.message || "確認に失敗しました。";
        previewMessage.classList.add("error");
      } finally {
        previewButton.disabled = false;
        previewButton.textContent = "プレビュー";
      }
    }
    previewButton.addEventListener("click", previewAudience);

    // Save
    if (saveButton) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (message) { message.className = "message"; message.textContent = ""; }
        const formData = new FormData(form);
        const attachmentName = String(formData.get("attachment_name") || "").trim();
        const attachmentUrl = String(formData.get("attachment_url") || "").trim();
        const attachments = attachmentName || attachmentUrl ? [{ name: attachmentName, url: attachmentUrl }] : [];

        const payload = {
          id: String(formData.get("id") || "").trim(),
          title: String(formData.get("title") || "").trim(),
          body: String(formData.get("body") || "").trim(),
          channel: String(formData.get("channel") || "email").trim(),
          status: String(formData.get("status") || "draft").trim(),
          audience_type: String(formData.get("audience_type") || "all").trim(),
          audience_filter_json: String(formData.get("audience_filter_json") || "").trim(),
          scheduled_at: String(formData.get("scheduled_at") || "").trim(),
          last_sent_at: "",
          error_message: String(formData.get("error_message") || "").trim(),
          attachment_info: String(formData.get("attachment_info") || "").trim(),
          attachments_json: JSON.stringify(attachments)
        };

        if (!payload.title) { if (message) { message.textContent = "件名を入力してください。"; message.classList.add("error"); } return; }
        if (!payload.body) { if (message) { message.textContent = "本文を入力してください。"; message.classList.add("error"); } return; }

        saveButton.disabled = true;
        saveButton.textContent = "保存中...";
        try {
          const result = await apiRequest("save-newsletter-draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          showToast("下書きを保存しました");
          activeId = result.newsletter?.id || currentId || "";
          await loadNewsletters();
        } catch (error) {
          if (message) { message.textContent = error.message || "保存に失敗しました。"; message.classList.add("error"); }
          saveButton.disabled = false;
          saveButton.textContent = "下書き保存";
        }
      });
    }

    // Send
    const sendButton = document.getElementById("newsletter-send");
    if (sendButton && currentId) {
      sendButton.addEventListener("click", async () => {
        // Build confirm message
        const formData = new FormData(form);
        const scheduledAt = String(formData.get("scheduled_at") || "").trim();
        let confirmMsg;
        if (scheduledAt) {
          const d = new Date(scheduledAt);
          confirmMsg = `${d.getMonth()+1}月${d.getDate()}日 ${d.getHours()}時${String(d.getMinutes()).padStart(2,"0")}分に送信予約します。\nよろしいですか？`;
        } else {
          confirmMsg = "この配信を今すぐ送信します。\n送信後は取り消せません。よろしいですか？";
        }
        if (!confirm(confirmMsg)) return;

        if (message) { message.className = "message"; message.textContent = ""; }
        sendButton.disabled = true;
        sendButton.innerHTML = '<span class="nl-spinner"></span> 送信中...';
        try {
          const result = await apiRequest("send-newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ newsletter_id: currentId })
          });
          showToast(`送信完了: ${result.success_count}名に送信しました`);
          activeId = currentId;
          await loadNewsletters();
        } catch (error) {
          if (message) { message.textContent = error.message || "送信に失敗しました。"; message.classList.add("error"); }
          sendButton.disabled = false;
          sendButton.textContent = "送信する";
        }
      });
    }
  }

  async function loadNewsletters() {
    listSlot.innerHTML = '<div class="nl-skeleton"><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>';
    try {
      const result = await apiRequest("list-newsletters-admin");
      newsletters = result.newsletters || [];
      if (activeId && !newsletters.some((n) => n.id === activeId)) activeId = "";
      renderList();
      await loadDetail(activeId);
    } catch (error) {
      listSlot.innerHTML = `<p class="message error">${escapeHtml(error.message || "一覧取得に失敗")}</p>`;
    }
  }

  // Tab switching
  if (statusTabs) {
    statusTabs.addEventListener("click", (e) => {
      const tab = e.target.closest("[data-filter]");
      if (!tab) return;
      currentFilter = tab.dataset.filter;
      statusTabs.querySelectorAll(".nl-tab").forEach((t) => t.classList.toggle("active", t === tab));
      renderList();
    });
  }

  createButton.addEventListener("click", async () => {
    activeId = "";
    renderList();
    sessionStorage.removeItem("newsletter-message");
    await loadDetail("");
  });

  await loadNewsletters();
}

function createEmptyOrgDocument() {
  return {
    id: "",
    title: "",
    doc_type: "事業計画",
    fiscal_year_id: "",
    content: "",
    attachment: "",
    category: "",
    published: false,
    sort_order: 0,
    updated_at: ""
  };
}

function isManualDocType(docType) {
  return docType === "運用マニュアル";
}

function renderOrgDocumentRows(documents, selectedId) {
  if (!documents.length) {
    return '<p class="empty-state">資料はまだありません。</p>';
  }

  return `
    <div class="pending-list stack-sm">
      ${documents
        .map(
          (document) => `
            <button class="pending-item ${document.id === selectedId ? "is-selected" : ""}" data-document-id="${escapeHtml(document.id)}" type="button">
              <span class="pending-date">${escapeHtml(displayValue(document.updated_at || "-"))}</span>
              <strong>${escapeHtml(displayValue(document.title))}</strong>
              <span>${escapeHtml(displayValue(document.doc_type))} / ${escapeHtml(displayValue(document.fiscal_year_label))}</span>
              <span>${document.published ? "公開中" : "非公開"} / sort: ${escapeHtml(String(document.sort_order || 0))}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOrgDocumentEditor(document, fiscalYears, flashMessage = "") {
  const current = document || createEmptyOrgDocument();
  const options = fiscalYears || [];

  return `
    <div class="detail-stack">
      <section class="detail-card stack-sm">
        <div class="detail-header-row">
          <div>

            <h2>${escapeHtml(current.id ? "資料詳細 / 編集" : "新規資料追加")}</h2>
          </div>
          <span class="pill">${current.published ? "公開中" : "非公開"}</span>
        </div>
        <p class="muted">M4 基本情報と M6 運用マニュアル向け資料を、タイトル・本文・添付 URL・公開フラグだけで管理する最小版です。</p>
      </section>

      <section class="detail-card stack">
        <form id="org-document-form" class="editor-form" novalidate>
          <input type="hidden" name="id" value="${escapeHtml(current.id)}" />
          <div class="field">
            <label for="org-document-title">タイトル</label>
            <input id="org-document-title" name="title" type="text" value="${escapeHtml(current.title)}" />
          </div>
          <div class="editor-grid">
            <div class="field">
              <label for="org-document-type">資料区分</label>
              <select id="org-document-type" name="doc_type">
                ${ADMIN_DOCUMENT_TYPES.map((docType) => `<option value="${escapeHtml(docType)}"${current.doc_type === docType ? " selected" : ""}>${escapeHtml(docType)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="org-document-fiscal-year">年度</label>
              <select id="org-document-fiscal-year" name="fiscal_year_id">
                <option value="">常設 / 年度なし</option>
                ${options.map((fiscalYear) => `<option value="${escapeHtml(fiscalYear.id)}"${current.fiscal_year_id === fiscalYear.id ? " selected" : ""}>${escapeHtml(String(fiscalYear.year || "-"))}年度${fiscalYear.is_current ? " (現在)" : ""}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="org-document-sort-order">sort_order</label>
              <input id="org-document-sort-order" name="sort_order" type="number" value="${escapeHtml(String(current.sort_order || 0))}" />
            </div>
            <div class="field checkbox-field">
              <label for="org-document-published">公開</label>
              <input id="org-document-published" name="published" type="checkbox"${current.published ? " checked" : ""} />
            </div>
          </div>
          <div class="field">
            <label for="org-document-content">本文</label>
            <textarea id="org-document-content" name="content" rows="12">${escapeHtml(current.content)}</textarea>
          </div>
          <div class="field">
            <label for="org-document-attachment">添付 URL</label>
            <input id="org-document-attachment" name="attachment" type="url" value="${escapeHtml(current.attachment)}" placeholder="https://example.com/file.pdf" />
          </div>
          <div id="org-document-category-field" class="field"${isManualDocType(current.doc_type) ? "" : ' hidden'}>
            <label for="org-document-category">category</label>
            <input id="org-document-category" name="category" type="text" value="${escapeHtml(current.category || "")}" placeholder="例: 運用 / 手順 / 会員向け" />
          </div>
          <section class="detail-card stack-sm inset-card">
            <div>

              <h3>保存済み情報</h3>
            </div>
            <dl class="detail-grid">
              <div><dt>資料区分</dt><dd>${escapeHtml(displayValue(current.doc_type))}</dd></div>
              <div><dt>年度</dt><dd>${escapeHtml(displayValue((options.find((fiscalYear) => fiscalYear.id === current.fiscal_year_id)?.year ? `${options.find((fiscalYear) => fiscalYear.id === current.fiscal_year_id)?.year}年度` : "") || "常設"))}</dd></div>
              <div><dt>category</dt><dd>${escapeHtml(displayValue(current.category || "-"))}</dd></div>
              <div><dt>公開</dt><dd>${current.published ? "はい" : "いいえ"}</dd></div>
              <div><dt>更新日時</dt><dd>${escapeHtml(displayValue(current.updated_at))}</dd></div>
            </dl>
          </section>
          <p id="org-document-message" class="message ${flashMessage ? "success" : ""}" aria-live="polite">${escapeHtml(flashMessage)}</p>
          <div class="actions">
            <button id="org-document-save" class="button" type="submit">保存する</button>
            ${current.id ? `<button id="org-document-toggle" class="button ghost" type="button">${current.published ? "非公開にする" : "公開にする"}</button>` : ""}
          </div>
        </form>
      </section>
    </div>
  `;
}

async function renderAdminDocuments(selectedId = "") {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">資料管理</h1>
        <p class="page-description">基本情報・運用マニュアル向け資料の登録・公開管理</p>
      </div>
      <div class="admin-grid">
        <section class="card panel-card">
          <div class="card-body">
            <div class="panel-heading">
              <div><h2>資料一覧</h2></div>
              <div class="actions">
                <button id="org-document-create" class="button ghost" type="button">新規追加</button>
              </div>
            </div>
            <p id="org-document-list-message" class="message" aria-live="polite"></p>
            <div id="org-document-list-slot"></div>
          </div>
        </section>
        <section class="card panel-card">
          <div class="card-body">
            <div class="panel-heading">
              <div>
    
                <h2>資料詳細</h2>
              </div>
            </div>
            <div id="org-document-detail-slot"></div>
          </div>
        </section>
      </div>
    </section>
  `);

  const listMessage = document.getElementById("org-document-list-message");
  const listSlot = document.getElementById("org-document-list-slot");
  const detailSlot = document.getElementById("org-document-detail-slot");
  const createButton = document.getElementById("org-document-create");

  let documents = [];
  let fiscalYears = [];
  let activeId = selectedId || "";

  async function loadDetail(id) {
    const flashMessage = sessionStorage.getItem("org-document-message") || "";
    sessionStorage.removeItem("org-document-message");

    if (!id) {
      detailSlot.innerHTML = renderOrgDocumentEditor(createEmptyOrgDocument(), fiscalYears, flashMessage);
      bindOrgDocumentForm();
      return;
    }

    detailSlot.innerHTML = '<p class="message">詳細を読み込んでいます...</p>';

    try {
      const result = await apiRequest(`get-org-document-detail?id=${encodeURIComponent(id)}`);
      detailSlot.innerHTML = renderOrgDocumentEditor(result.document, fiscalYears, flashMessage);
      bindOrgDocumentForm(result.document.id);
    } catch (error) {
      detailSlot.innerHTML = `<p class="message error">${escapeHtml(error.message || "資料詳細の取得に失敗しました。")}</p>`;
    }
  }

  function bindListActions() {
    listSlot.querySelectorAll("[data-document-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        activeId = button.dataset.documentId || "";
        listSlot.innerHTML = renderOrgDocumentRows(documents, activeId);
        bindListActions();
        await loadDetail(activeId);
      });
    });
  }

  function bindOrgDocumentForm(currentId = "") {
    const form = document.getElementById("org-document-form");
    const message = document.getElementById("org-document-message");
    const saveButton = document.getElementById("org-document-save");
    const toggleButton = document.getElementById("org-document-toggle");
    const docTypeSelect = document.getElementById("org-document-type");
    const categoryField = document.getElementById("org-document-category-field");
    const categoryInput = document.getElementById("org-document-category");

    if (!form || !message || !saveButton) {
      return;
    }

    function syncCategoryField() {
      if (!docTypeSelect || !categoryField || !categoryInput) {
        return;
      }

      const enabled = isManualDocType(docTypeSelect.value);
      categoryField.hidden = !enabled;
      categoryInput.disabled = !enabled;

      if (!enabled) {
        categoryInput.value = "";
      } else if (!String(categoryInput.value || "").trim()) {
        categoryInput.value = "運用マニュアル";
      }
    }

    if (docTypeSelect) {
      docTypeSelect.addEventListener("change", syncCategoryField);
      syncCategoryField();
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.className = "message";
      message.textContent = "";

      const formData = new FormData(form);
      const payload = {
        id: String(formData.get("id") || "").trim(),
        title: String(formData.get("title") || "").trim(),
        doc_type: String(formData.get("doc_type") || "").trim(),
        fiscal_year_id: String(formData.get("fiscal_year_id") || "").trim(),
        content: String(formData.get("content") || "").trim(),
        attachment: String(formData.get("attachment") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        published: formData.get("published") === "on",
        sort_order: Number(formData.get("sort_order") || 0)
      };

      if (!payload.title) {
        message.textContent = "タイトルを入力してください。";
        message.classList.add("error");
        return;
      }

      if (!payload.doc_type) {
        message.textContent = "資料区分を選択してください。";
        message.classList.add("error");
        return;
      }

      if (payload.attachment) {
        try {
          new URL(payload.attachment);
        } catch {
          message.textContent = "添付 URL の形式を確認してください。";
          message.classList.add("error");
          return;
        }
      }

      saveButton.disabled = true;
      saveButton.textContent = "保存中...";

      try {
        const result = await apiRequest("save-org-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        sessionStorage.setItem("org-document-message", "資料を保存しました。");
        await renderAdminDocuments(result.document?.id || currentId || "");
      } catch (error) {
        message.textContent = error.message || "保存に失敗しました。";
        message.classList.add("error");
        saveButton.disabled = false;
        saveButton.textContent = "保存する";
      }
    });

    if (toggleButton) {
      toggleButton.addEventListener("click", async () => {
        message.className = "message";
        message.textContent = "";
        toggleButton.disabled = true;
        toggleButton.textContent = "切替中...";

        try {
          await apiRequest("toggle-org-document-published", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: currentId })
          });
          sessionStorage.setItem("org-document-message", "公開状態を切り替えました。");
          await renderAdminDocuments(currentId);
        } catch (error) {
          message.textContent = error.message || "公開状態の切替に失敗しました。";
          message.classList.add("error");
          toggleButton.disabled = false;
          toggleButton.textContent = "公開状態を切り替える";
        }
      });
    }
  }

  async function loadDocuments() {
    listMessage.className = "message";
    listMessage.textContent = "読込中...";

    try {
      const [documentResult, fiscalYearResult] = await Promise.all([
        apiRequest("list-org-documents-admin"),
        apiRequest("list-fiscal-years-admin")
      ]);
      documents = documentResult.documents || [];
      fiscalYears = fiscalYearResult.fiscal_years || [];

      if (activeId && !documents.some((document) => document.id === activeId)) {
        activeId = "";
      }

      listSlot.innerHTML = renderOrgDocumentRows(documents, activeId);
      bindListActions();
      listMessage.textContent = documents.length
        ? `${documents.length}件を表示中 / 公開切替あり`
        : "資料はまだありません。";
      await loadDetail(activeId);
    } catch (error) {
      listSlot.innerHTML = '<p class="empty-state">一覧を表示できませんでした。</p>';
      detailSlot.innerHTML = '<p class="message error">資料詳細を表示できませんでした。</p>';
      listMessage.className = "message error";
      listMessage.textContent = error.message || "資料一覧の取得に失敗しました。";
    }
  }

  createButton.addEventListener("click", async () => {
    activeId = "";
    listSlot.innerHTML = renderOrgDocumentRows(documents, activeId);
    bindListActions();
    sessionStorage.removeItem("org-document-message");
    await loadDetail("");
  });

  await loadDocuments();
}

function createEmptyDue(fiscalYearId = "") {
  return {
    id: "",
    fiscal_year_id: fiscalYearId,
    member_id: "",
    member_name: "",
    member_type: "",
    member_number: "",
    amount: 0,
    status: "未納",
    paid_date: "",
    notes: ""
  };
}

function renderDueRows(dues, selectedId) {
  if (!dues.length) {
    return '<p class="empty-state">この年度の会費対象会員はまだありません。</p>';
  }

  return `
    <div class="pending-list stack-sm">
      ${dues
        .map(
          (due) => `
            <button class="pending-item ${due.id === selectedId ? "is-selected" : ""}" data-due-id="${escapeHtml(due.id)}" type="button">
              <span class="pending-date">${escapeHtml(displayValue(due.member_type))} / ${escapeHtml(formatCurrency(due.amount || 0))}</span>
              <strong>${escapeHtml(displayValue(due.member_name))}</strong>
              <span>${escapeHtml(displayValue(due.status))}${due.paid_date ? ` / ${escapeHtml(due.paid_date)}` : ""}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDueSummary(summary) {
  return `
    <section class="detail-card stack-sm">
      <div class="panel-heading compact">
        <div>

          <h3>簡易集計</h3>
        </div>
      </div>
      <div class="a3-summary-grid">
        <section class="detail-card inset-card stack-sm">
          <span class="metric-label">対象件数</span>
          <strong>${escapeHtml(String(summary.total_count || 0))}件</strong>
          <span class="muted">納入済 ${escapeHtml(String(summary.paid_count || 0))}件 / 未納 ${escapeHtml(String(summary.unpaid_count || 0))}件</span>
        </section>
        <section class="detail-card inset-card stack-sm">
          <span class="metric-label">請求総額</span>
          <strong>${escapeHtml(formatCurrency(summary.total_amount || 0))}</strong>
          <span class="muted">納入済 ${escapeHtml(formatCurrency(summary.paid_amount || 0))}</span>
        </section>
        <section class="detail-card inset-card stack-sm">
          <span class="metric-label">未納総額</span>
          <strong>${escapeHtml(formatCurrency(summary.unpaid_amount || 0))}</strong>
          <span class="muted">概算表示</span>
        </section>
      </div>
    </section>
  `;
}

function renderDueEditor(data) {
  const due = data.due;
  const fiscalYears = data.fiscalYears || [];
  const selectedFiscalYearId = data.selectedFiscalYearId || "";
  const selectedFiscalYear = fiscalYears.find((fiscalYear) => fiscalYear.id === selectedFiscalYearId);
  const dueSettings = data.dueSettings || {};
  const summary = data.summary || {};

  return `
    <div class="detail-stack">
      <section class="detail-card stack-sm">
        <div class="detail-header-row">
          <div>

            <h2>会費管理</h2>
          </div>
          <span class="pill">${escapeHtml(selectedFiscalYear?.year ? `${selectedFiscalYear.year}年度` : "年度未選択")}</span>
        </div>
        <p class="muted">年度ごとの会費一覧と納入状況管理</p>
      </section>

      <section class="detail-card stack">
        <form id="dues-filter-form" class="editor-grid" novalidate>
          <div class="field">
            <label for="dues-fiscal-year">年度</label>
            <select id="dues-fiscal-year" name="fiscal_year_id">
              ${fiscalYears.map((fiscalYear) => `<option value="${escapeHtml(fiscalYear.id)}"${selectedFiscalYearId === fiscalYear.id ? " selected" : ""}>${escapeHtml(String(fiscalYear.year || "-"))}年度${fiscalYear.is_current ? " (現在)" : ""}</option>`).join("")}
            </select>
          </div>
        </form>
      </section>

      ${renderDueSummary(summary)}

      <section class="detail-card stack">
        <div class="panel-heading compact">
          <div><h3>一括操作</h3></div>
        </div>
        <div class="actions" style="flex-wrap:wrap">
          <button id="send-due-reminder" class="button ghost" type="button"${summary.unpaid_count > 0 ? "" : " disabled"}>未納者にリマインドメール送信 (${summary.unpaid_count || 0}名)</button>
          <button id="batch-mark-paid" class="button ghost" type="button"${summary.unpaid_count > 0 ? "" : " disabled"}>全員を納入済にする</button>
        </div>
        <p id="batch-action-message" class="message" aria-live="polite"></p>
      </section>

      <section class="detail-card stack">
        <div class="panel-heading compact">
          <div>

            <h3>会費金額設定</h3>
          </div>
        </div>
        <form id="due-settings-form" class="editor-form" novalidate>
          <input type="hidden" name="fiscal_year_id" value="${escapeHtml(selectedFiscalYearId)}" />
          <div class="editor-grid">
            <div class="field">
              <label for="due-setting-regular">正会員</label>
              <input id="due-setting-regular" name="regular_member_amount" type="number" min="0" value="${escapeHtml(String(dueSettings.regular_member_amount || 0))}" />
            </div>
            <div class="field">
              <label for="due-setting-supporting">賛助会員</label>
              <input id="due-setting-supporting" name="supporting_member_amount" type="number" min="0" value="${escapeHtml(String(dueSettings.supporting_member_amount || 0))}" />
            </div>
          </div>
          <p id="due-settings-message" class="message" aria-live="polite"></p>
          <div class="actions">
            <button id="due-settings-save" class="button" type="submit">金額設定を保存</button>
          </div>
        </form>
      </section>

      <section class="detail-card stack">
        <div class="panel-heading compact">
          <div>

            <h3>${escapeHtml(due.id ? "会費更新" : "会費詳細")}</h3>
          </div>
          ${due.id ? `<span class="pill">${escapeHtml(displayValue(due.status))}</span>` : ""}
        </div>
        ${
          due.id
            ? `
              <form id="due-form" class="editor-form" novalidate>
                <input type="hidden" name="id" value="${escapeHtml(due.id)}" />
                <input type="hidden" name="fiscal_year_id" value="${escapeHtml(due.fiscal_year_id || "")}" />
                <input type="hidden" name="member_id" value="${escapeHtml(due.member_id || "")}" />
                <input type="hidden" name="amount" value="${escapeHtml(String(due.amount || 0))}" />
                <div class="editor-grid">
                  <div class="field">
                    <label>会員名</label>
                    <input type="text" value="${escapeHtml(displayValue(due.member_name))}" readonly />
                  </div>
                  <div class="field">
                    <label>会員種別</label>
                    <input type="text" value="${escapeHtml(displayValue(due.member_type))}" readonly />
                  </div>
                  <div class="field">
                    <label>会員番号</label>
                    <input type="text" value="${escapeHtml(displayValue(due.member_number))}" readonly />
                  </div>
                  <div class="field">
                    <label>請求額</label>
                    <input type="text" value="${escapeHtml(formatCurrency(due.amount || 0))}" readonly />
                  </div>
                  <div class="field">
                    <label for="due-status">ステータス</label>
                    <select id="due-status" name="status">
                      ${A5_DUE_STATUSES.map((status) => `<option value="${escapeHtml(status)}"${due.status === status ? " selected" : ""}>${escapeHtml(status)}</option>`).join("")}
                    </select>
                  </div>
                  <div class="field">
                    <label for="due-paid-date">入金日</label>
                    <input id="due-paid-date" name="paid_date" type="date" value="${escapeHtml(due.paid_date || "")}" />
                  </div>
                </div>
                <div class="field">
                  <label for="due-note">備考</label>
                  <textarea id="due-note" name="notes" rows="4" placeholder="任意メモ">${escapeHtml(due.notes || "")}</textarea>
                </div>
                <p id="due-message" class="message" aria-live="polite"></p>
                <div class="actions">
                  <button id="due-save" class="button" type="submit">納入状態を保存</button>
                </div>
              </form>
            `
            : '<p class="empty-state">会費対象会員を選択すると、納入状態を更新できます。</p>'
        }
      </section>
    </div>
  `;
}

async function renderAdminDuesManagement(options = {}) {
  const url = new URL(window.location.href);
  const fiscalYearFromQuery = url.searchParams.get("fiscalYearId") || "";
  const initialFiscalYearId = options.fiscalYearId || fiscalYearFromQuery;

  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">会費管理</h1>
        <p class="page-description">年度ごとの会費一覧と納入状況管理</p>
      </div>
      <div class="admin-grid admin-grid-wide">
        <section class="card panel-card">
          <div class="card-body">
            <div class="panel-heading">
              <div>
    
                <h2>会費一覧</h2>
              </div>
            </div>
            <p id="due-list-message" class="message" aria-live="polite"></p>
            <div id="due-list-slot"></div>
          </div>
        </section>
        <section class="card panel-card">
          <div class="card-body">
            <div id="due-detail-slot"></div>
          </div>
        </section>
      </div>
    </section>
  `);

  const listMessage = document.getElementById("due-list-message");
  const listSlot = document.getElementById("due-list-slot");
  const detailSlot = document.getElementById("due-detail-slot");

  let fiscalYears = [];
  let dues = [];
  let dueSettings = {};
  let summary = {};
  let selectedFiscalYearId = initialFiscalYearId;
  let selectedDueId = options.dueId || "";

  function getSelectedDue() {
    return dues.find((due) => due.id === selectedDueId) || null;
  }

  function bindListActions() {
    listSlot.querySelectorAll("[data-due-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedDueId = button.dataset.dueId || "";
        listSlot.innerHTML = renderDueRows(dues, selectedDueId);
        bindListActions();
        renderDetail();
      });
    });
  }

  function bindDetailActions() {
    const filterForm = document.getElementById("dues-filter-form");
    const settingsForm = document.getElementById("due-settings-form");
    const settingsMessage = document.getElementById("due-settings-message");
    const settingsSave = document.getElementById("due-settings-save");
    const dueForm = document.getElementById("due-form");
    const dueMessage = document.getElementById("due-message");
    const dueSave = document.getElementById("due-save");
    const sendReminderBtn = document.getElementById("send-due-reminder");
    const batchMarkPaidBtn = document.getElementById("batch-mark-paid");
    const batchMessage = document.getElementById("batch-action-message");

    if (sendReminderBtn) {
      sendReminderBtn.addEventListener("click", async () => {
        if (!confirm(`未納の${summary.unpaid_count || 0}名にリマインドメールを送信しますか？`)) return;
        sendReminderBtn.disabled = true;
        sendReminderBtn.textContent = "送信中...";
        if (batchMessage) { batchMessage.className = "message"; batchMessage.textContent = ""; }
        try {
          const result = await apiRequest("send-due-reminder", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fiscal_year_id: selectedFiscalYearId })
          });
          if (batchMessage) {
            batchMessage.textContent = `${result.sent_count || 0}名に送信しました。${result.fail_count ? ` 失敗: ${result.fail_count}件` : ""}`;
            batchMessage.className = "message success";
          }
        } catch (error) {
          if (batchMessage) {
            batchMessage.textContent = error.message || "リマインド送信に失敗しました。";
            batchMessage.className = "message error";
          }
        }
        sendReminderBtn.disabled = false;
        sendReminderBtn.textContent = `未納者にリマインドメール送信 (${summary.unpaid_count || 0}名)`;
      });
    }

    if (batchMarkPaidBtn) {
      batchMarkPaidBtn.addEventListener("click", async () => {
        if (!confirm(`未納の全${summary.unpaid_count || 0}件を納入済に変更しますか？`)) return;
        batchMarkPaidBtn.disabled = true;
        batchMarkPaidBtn.textContent = "更新中...";
        if (batchMessage) { batchMessage.className = "message"; batchMessage.textContent = ""; }
        try {
          const result = await apiRequest("batch-update-dues", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fiscal_year_id: selectedFiscalYearId, status: "納入済", paid_date: new Date().toISOString().slice(0, 10) })
          });
          if (batchMessage) {
            batchMessage.textContent = `${result.updated_count || 0}件を納入済に更新しました。`;
            batchMessage.className = "message success";
          }
          await loadDues();
        } catch (error) {
          if (batchMessage) {
            batchMessage.textContent = error.message || "一括更新に失敗しました。";
            batchMessage.className = "message error";
          }
          batchMarkPaidBtn.disabled = false;
          batchMarkPaidBtn.textContent = "全員を納入済にする";
        }
      });
    }

    if (filterForm) {
      filterForm.addEventListener("change", () => {
        const nextFiscalYearId = String(new FormData(filterForm).get("fiscal_year_id") || "").trim();
        const nextUrl = new URL(window.location.href);
        if (nextFiscalYearId) {
          nextUrl.searchParams.set("fiscalYearId", nextFiscalYearId);
        } else {
          nextUrl.searchParams.delete("fiscalYearId");
        }
        window.location.assign(`${nextUrl.pathname}${nextUrl.search}`);
      });
    }

    if (settingsForm && settingsMessage && settingsSave) {
      settingsForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        settingsMessage.className = "message";
        settingsMessage.textContent = "";

        const formData = new FormData(settingsForm);
        const payload = {
          fiscal_year_id: String(formData.get("fiscal_year_id") || "").trim(),
          settings: [
            { member_type: "正会員", amount: Number(formData.get("regular_member_amount") || 0) },
            { member_type: "賛助会員", amount: Number(formData.get("supporting_member_amount") || 0) }
          ]
        };

        settingsSave.disabled = true;
        settingsSave.textContent = "保存中...";

        try {
          await apiRequest("save-due-settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          await loadDues("金額設定を保存しました。");
        } catch (error) {
          settingsMessage.textContent = error.message || "金額設定の保存に失敗しました。";
          settingsMessage.classList.add("error");
          settingsSave.disabled = false;
          settingsSave.textContent = "金額設定を保存";
        }
      });
    }

    if (dueForm && dueMessage && dueSave) {
      dueForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        dueMessage.className = "message";
        dueMessage.textContent = "";

        const formData = new FormData(dueForm);
        const payload = {
          id: String(formData.get("id") || "").trim(),
          fiscal_year_id: String(formData.get("fiscal_year_id") || "").trim(),
          member_id: String(formData.get("member_id") || "").trim(),
          amount: Number(formData.get("amount") || 0),
          status: String(formData.get("status") || "").trim(),
          paid_date: String(formData.get("paid_date") || "").trim(),
          notes: String(formData.get("notes") || "").trim()
        };

        if (payload.status === "納入済" && !payload.paid_date) {
          dueMessage.textContent = "納入済にする場合は入金日を入力してください。";
          dueMessage.classList.add("error");
          return;
        }

        dueSave.disabled = true;
        dueSave.textContent = "保存中...";

        try {
          const result = await apiRequest("save-due", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          selectedDueId = result.due?.id || selectedDueId;
          await loadDues("納入状態を保存しました。");
        } catch (error) {
          dueMessage.textContent = error.message || "会費の保存に失敗しました。";
          dueMessage.classList.add("error");
          dueSave.disabled = false;
          dueSave.textContent = "納入状態を保存";
        }
      });
    }
  }

  function renderDetail(flashMessage = "") {
    const selectedDue = getSelectedDue() || createEmptyDue(selectedFiscalYearId);

    detailSlot.innerHTML = renderDueEditor({
      due: selectedDue,
      fiscalYears,
      selectedFiscalYearId,
      dueSettings,
      summary
    });

    bindDetailActions();

    if (flashMessage) {
      const settingsMessage = document.getElementById("due-settings-message");
      const dueMessage = document.getElementById("due-message");
      const target = selectedDue.id ? dueMessage : settingsMessage;
      if (target) {
        target.textContent = flashMessage;
        target.className = "message success";
      }
    }
  }

  async function loadDues(flashMessage = "") {
    listMessage.className = "message";
    listMessage.textContent = "読込中...";

    try {
      const query = selectedFiscalYearId ? `?fiscalYearId=${encodeURIComponent(selectedFiscalYearId)}` : "";
      const result = await apiRequest(`list-dues-admin${query}`);
      fiscalYears = result.fiscal_years || [];
      dues = result.dues || [];
      dueSettings = result.due_settings || {};
      summary = result.summary || {};
      selectedFiscalYearId = result.selected_fiscal_year?.id || result.current_fiscal_year_id || "";

      if (selectedDueId && !dues.some((due) => due.id === selectedDueId)) {
        selectedDueId = "";
      }
      if (!selectedDueId) {
        selectedDueId = dues[0]?.id || "";
      }

      listSlot.innerHTML = renderDueRows(dues, selectedDueId);
      bindListActions();
      listMessage.textContent = dues.length
        ? `${dues.length}件を表示中 / 納入済 ${summary.paid_count || 0}件`
        : "会費対象会員はまだありません。";
      renderDetail(flashMessage);
    } catch (error) {
      listSlot.innerHTML = '<p class="empty-state">一覧を表示できませんでした。</p>';
      detailSlot.innerHTML = '<p class="message error">会費詳細を表示できませんでした。</p>';
      listMessage.className = "message error";
      listMessage.textContent = error.message || "会費一覧の取得に失敗しました。";
    }
  }

  await loadDues();
}

function createEmptyOrganization(fiscalYearId = "") {
  return {
    id: "",
    fiscal_year_id: fiscalYearId,
    org_name: "",
    org_type: "委員会",
    parent_id: "",
    sort_order: 0,
    assignments: []
  };
}

function createEmptyOrgAssignment(fiscalYearId = "", organizationId = "") {
  return {
    id: "",
    fiscal_year_id: fiscalYearId,
    organization_id: organizationId,
    member_id: "",
    role: "",
    sort_order: 0
  };
}

function renderOrgTreeNode(org, selectedId, depth) {
  const indent = depth * 16;
  return `
    <button class="pending-item ${org.id === selectedId ? "is-selected" : ""}" data-organization-id="${escapeHtml(org.id)}" type="button" style="padding-left:${12 + indent}px">
      <span class="pending-date">${escapeHtml(displayValue(org.org_type))} / 配属 ${(org.assignments || []).length}名</span>
      <strong>${depth > 0 ? "└ " : ""}${escapeHtml(displayValue(org.org_name))}</strong>
    </button>
    ${(org.children || []).map((child) => renderOrgTreeNode(child, selectedId, depth + 1)).join("")}
  `;
}

function renderOrganizationRows(organizations, selectedId) {
  if (!organizations.length) {
    return '<p class="empty-state">この年度の組織はまだありません。</p>';
  }

  // Build tree
  const orgById = new Map();
  organizations.forEach((o) => { orgById.set(o.id, { ...o, children: [] }); });
  const roots = [];
  orgById.forEach((o) => {
    const pid = o.parent_id || "";
    if (pid && orgById.has(pid)) {
      orgById.get(pid).children.push(o);
    } else {
      roots.push(o);
    }
  });
  // Sort children by sort_order
  function sortTree(nodes) {
    nodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    nodes.forEach((n) => sortTree(n.children));
  }
  sortTree(roots);

  return `
    <div class="pending-list stack-sm">
      ${roots.map((org) => renderOrgTreeNode(org, selectedId, 0)).join("")}
    </div>
  `;
}

function renderAssignmentRows(assignments, selectedId) {
  if (!assignments.length) {
    return '<p class="empty-state">この組織の配属はまだありません。</p>';
  }

  return `
    <div class="pending-list stack-sm">
      ${assignments
        .map(
          (assignment) => `
            <button class="pending-item ${assignment.id === selectedId ? "is-selected" : ""}" data-assignment-id="${escapeHtml(assignment.id)}" type="button">
              <span class="pending-date">${escapeHtml(displayValue(assignment.member_type || "-"))} / sort: ${escapeHtml(String(assignment.sort_order || 0))}</span>
              <strong>${escapeHtml(displayValue(assignment.role))}</strong>
              <span>${escapeHtml(displayValue(assignment.member_name || "会員未選択"))}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOrganizationEditor(data) {
  const organization = data.organization;
  const assignment = data.assignment;
  const organizations = data.organizations || [];
  const members = data.members || [];
  const fiscalYears = data.fiscalYears || [];
  const selectedFiscalYearId = data.selectedFiscalYearId || "";
  const selectedFiscalYear = fiscalYears.find((fiscalYear) => fiscalYear.id === selectedFiscalYearId);
  const selectedAssignments = organization.id
    ? organizations.find((item) => item.id === organization.id)?.assignments || []
    : [];

  return `
    <div class="detail-stack">
      <section class="detail-card stack-sm">
        <div class="detail-header-row">
          <div>

            <h2>組織図管理</h2>
          </div>
          <span class="pill">${escapeHtml(selectedFiscalYear?.year ? `${selectedFiscalYear.year}年度` : "年度未選択")}</span>
        </div>
        <p class="muted">年度単位で組織と役職付き配属を管理します。前年度の組織構成をコピーすることも可能です。</p>
      </section>

      <section class="detail-card stack">
        <form id="organization-filter-form" class="editor-grid" novalidate>
          <div class="field">
            <label for="organization-fiscal-year">年度</label>
            <select id="organization-fiscal-year" name="fiscal_year_id">
              ${fiscalYears.map((fiscalYear) => `<option value="${escapeHtml(fiscalYear.id)}"${selectedFiscalYearId === fiscalYear.id ? " selected" : ""}>${escapeHtml(String(fiscalYear.year || "-"))}年度${fiscalYear.is_current ? " (現在)" : ""}</option>`).join("")}
            </select>
          </div>
          <div class="field" style="align-self:end">
            <button id="copy-prev-year-orgs" class="button ghost" type="button"${organizations.length > 0 ? ' disabled title="この年度には既に組織があります"' : ""}>前年度からコピー</button>
          </div>
        </form>
        <p id="copy-year-message" class="message" aria-live="polite"></p>
      </section>

      <section class="detail-card stack">
        <div class="panel-heading compact">
          <div>

            <h3>${escapeHtml(organization.id ? "組織編集" : "組織新規追加")}</h3>
          </div>
          <button id="organization-reset" class="button ghost" type="button">新規組織</button>
        </div>
        <form id="organization-form" class="editor-form" novalidate>
          <input type="hidden" name="id" value="${escapeHtml(organization.id)}" />
          <input type="hidden" name="fiscal_year_id" value="${escapeHtml(selectedFiscalYearId)}" />
          <div class="editor-grid">
            <div class="field">
              <label for="organization-name">組織名</label>
              <input id="organization-name" name="org_name" type="text" value="${escapeHtml(organization.org_name)}" />
            </div>
            <div class="field">
              <label for="organization-type">組織種別</label>
              <select id="organization-type" name="org_type">
                ${ADMIN_ORG_TYPES.map((orgType) => `<option value="${escapeHtml(orgType)}"${organization.org_type === orgType ? " selected" : ""}>${escapeHtml(orgType)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="organization-parent">親組織</label>
              <select id="organization-parent" name="parent_id">
                <option value="">なし</option>
                ${organizations.filter((item) => item.id !== organization.id).map((item) => `<option value="${escapeHtml(item.id)}"${organization.parent_id === item.id ? " selected" : ""}>${escapeHtml(item.org_name)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="organization-sort-order">sort_order</label>
              <input id="organization-sort-order" name="sort_order" type="number" value="${escapeHtml(String(organization.sort_order || 0))}" />
            </div>
          </div>
          <p id="organization-message" class="message" aria-live="polite"></p>
          <div class="actions">
            <button id="organization-save" class="button" type="submit">組織を保存</button>
            ${organization.id ? '<button id="organization-delete" class="button ghost" type="button">組織を削除</button>' : ""}
          </div>
        </form>
      </section>

      <section class="detail-card stack">
        <div class="panel-heading compact">
          <div>

            <h3>配属一覧</h3>
          </div>
          <button id="assignment-reset" class="button ghost" type="button"${organization.id ? "" : " disabled"}>新規配属</button>
        </div>
        <div id="assignment-list-slot">${renderAssignmentRows(selectedAssignments, assignment.id)}</div>
      </section>

      <section class="detail-card stack">
        <div class="panel-heading compact">
          <div>

            <h3>${escapeHtml(assignment.id ? "配属編集" : "配属新規追加")}</h3>
          </div>
        </div>
        ${organization.id ? `
          <form id="assignment-form" class="editor-form" novalidate>
            <input type="hidden" name="id" value="${escapeHtml(assignment.id)}" />
            <input type="hidden" name="fiscal_year_id" value="${escapeHtml(selectedFiscalYearId)}" />
            <input type="hidden" name="organization_id" value="${escapeHtml(organization.id)}" />
            <div class="editor-grid">
              <div class="field">
                <label for="assignment-member-id">会員</label>
                <select id="assignment-member-id" name="member_id">
                  <option value="">選択してください</option>
                  ${members.map((member) => `<option value="${escapeHtml(member.id)}"${assignment.member_id === member.id ? " selected" : ""}>${escapeHtml(member.name_kanji)}${member.member_type ? ` / ${escapeHtml(member.member_type)}` : ""}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <label for="assignment-role">役職名</label>
                <input id="assignment-role" name="role" type="text" value="${escapeHtml(assignment.role)}" placeholder="例: 委員長" />
              </div>
              <div class="field">
                <label for="assignment-sort-order">sort_order</label>
                <input id="assignment-sort-order" name="sort_order" type="number" value="${escapeHtml(String(assignment.sort_order || 0))}" />
              </div>
            </div>
            <p id="assignment-message" class="message" aria-live="polite"></p>
            <div class="actions">
              <button id="assignment-save" class="button" type="submit">配属を保存</button>
              ${assignment.id ? '<button id="assignment-delete" class="button ghost" type="button">配属を削除</button>' : ""}
            </div>
          </form>
        ` : '<p class="empty-state">先に組織を保存すると、配属を登録できます。</p>'}
      </section>
    </div>
  `;
}

async function renderAdminOrganizationChart(options = {}) {
  const url = new URL(window.location.href);
  const fiscalYearFromQuery = url.searchParams.get("fiscalYearId") || "";
  const initialFiscalYearId = options.fiscalYearId || fiscalYearFromQuery;

  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">組織図管理</h1>
        <p class="page-description">年度ごとの組織と配属の管理</p>
      </div>
      <div class="admin-grid admin-grid-wide">
        <section class="card panel-card">
          <div class="card-body">
            <div class="panel-heading">
              <div>
    
                <h2>組織一覧</h2>
              </div>
            </div>
            <p id="organization-list-message" class="message" aria-live="polite"></p>
            <div id="organization-list-slot"></div>
          </div>
        </section>
        <section class="card panel-card">
          <div class="card-body">
            <div id="organization-detail-slot"></div>
          </div>
        </section>
      </div>
    </section>
  `);

  const listMessage = document.getElementById("organization-list-message");
  const listSlot = document.getElementById("organization-list-slot");
  const detailSlot = document.getElementById("organization-detail-slot");

  let fiscalYears = [];
  let organizations = [];
  let members = [];
  let selectedFiscalYearId = initialFiscalYearId;
  let selectedOrganizationId = options.organizationId || "";
  let selectedAssignmentId = options.assignmentId || "";

  function getSelectedOrganization() {
    return organizations.find((organization) => organization.id === selectedOrganizationId) || null;
  }

  function getSelectedAssignment() {
    const organization = getSelectedOrganization();
    return organization?.assignments?.find((assignment) => assignment.id === selectedAssignmentId) || null;
  }

  function renderDetail(flashMessage = "") {
    const selectedOrganization = getSelectedOrganization() || createEmptyOrganization(selectedFiscalYearId);
    const selectedAssignment = getSelectedAssignment() || createEmptyOrgAssignment(selectedFiscalYearId, selectedOrganization.id);

    detailSlot.innerHTML = renderOrganizationEditor({
      organization: selectedOrganization,
      assignment: selectedAssignment,
      organizations,
      members,
      fiscalYears,
      selectedFiscalYearId
    });

    bindDetailActions(flashMessage);
  }

  function bindListActions() {
    listSlot.querySelectorAll("[data-organization-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedOrganizationId = button.dataset.organizationId || "";
        selectedAssignmentId = "";
        listSlot.innerHTML = renderOrganizationRows(organizations, selectedOrganizationId);
        bindListActions();
        renderDetail();
      });
    });
  }

  function bindAssignmentListActions() {
    detailSlot.querySelectorAll("[data-assignment-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedAssignmentId = button.dataset.assignmentId || "";
        renderDetail();
      });
    });
  }

  function bindDetailActions(flashMessage = "") {
    const filterForm = document.getElementById("organization-filter-form");
    const organizationForm = document.getElementById("organization-form");
    const assignmentForm = document.getElementById("assignment-form");
    const organizationMessage = document.getElementById("organization-message");
    const assignmentMessage = document.getElementById("assignment-message");
    const organizationReset = document.getElementById("organization-reset");
    const copyPrevYearBtn = document.getElementById("copy-prev-year-orgs");
    const copyYearMessage = document.getElementById("copy-year-message");

    if (copyPrevYearBtn && !copyPrevYearBtn.disabled) {
      copyPrevYearBtn.addEventListener("click", async () => {
        if (!confirm("前年度の組織・配属をこの年度にコピーしますか？")) return;
        copyPrevYearBtn.disabled = true;
        copyPrevYearBtn.textContent = "コピー中...";
        if (copyYearMessage) { copyYearMessage.className = "message"; copyYearMessage.textContent = ""; }
        try {
          const result = await apiRequest("copy-organizations-to-year", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target_fiscal_year_id: selectedFiscalYearId })
          });
          if (copyYearMessage) {
            copyYearMessage.textContent = result.message || "コピーが完了しました。";
            copyYearMessage.className = "message success";
          }
          await loadAdminData("前年度からのコピーが完了しました。");
        } catch (error) {
          if (copyYearMessage) {
            copyYearMessage.textContent = error.message || "コピーに失敗しました。";
            copyYearMessage.className = "message error";
          }
          copyPrevYearBtn.disabled = false;
          copyPrevYearBtn.textContent = "前年度からコピー";
        }
      });
    }
    const assignmentReset = document.getElementById("assignment-reset");
    const organizationDelete = document.getElementById("organization-delete");
    const assignmentDelete = document.getElementById("assignment-delete");

    if (organizationMessage && flashMessage) {
      organizationMessage.textContent = flashMessage;
      organizationMessage.className = "message success";
    }

    if (filterForm) {
      filterForm.addEventListener("change", () => {
        const nextFiscalYearId = String(new FormData(filterForm).get("fiscal_year_id") || "").trim();
        const nextUrl = new URL(window.location.href);
        if (nextFiscalYearId) {
          nextUrl.searchParams.set("fiscalYearId", nextFiscalYearId);
        } else {
          nextUrl.searchParams.delete("fiscalYearId");
        }
        window.location.assign(`${nextUrl.pathname}${nextUrl.search}`);
      });
    }

    if (organizationReset) {
      organizationReset.addEventListener("click", () => {
        selectedOrganizationId = "";
        selectedAssignmentId = "";
        renderDetail();
      });
    }

    if (assignmentReset) {
      assignmentReset.addEventListener("click", () => {
        selectedAssignmentId = "";
        renderDetail();
      });
    }

    bindAssignmentListActions();

    if (organizationForm) {
      organizationForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        organizationMessage.className = "message";
        organizationMessage.textContent = "";

        const formData = new FormData(organizationForm);
        const payload = {
          id: String(formData.get("id") || "").trim(),
          fiscal_year_id: String(formData.get("fiscal_year_id") || "").trim(),
          org_name: String(formData.get("org_name") || "").trim(),
          org_type: String(formData.get("org_type") || "その他").trim(),
          parent_id: String(formData.get("parent_id") || "").trim(),
          sort_order: Number(formData.get("sort_order") || 0)
        };

        if (!payload.org_name) {
          organizationMessage.textContent = "組織名を入力してください。";
          organizationMessage.classList.add("error");
          return;
        }

        try {
          const result = await apiRequest("save-organization", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          selectedOrganizationId = result.organization?.id || "";
          selectedAssignmentId = "";
          await loadAdminData("組織を保存しました。");
        } catch (error) {
          organizationMessage.textContent = error.message || "組織の保存に失敗しました。";
          organizationMessage.classList.add("error");
        }
      });
    }

    if (organizationDelete && organizationMessage) {
      organizationDelete.addEventListener("click", async () => {
        organizationMessage.className = "message";
        organizationMessage.textContent = "";
        organizationDelete.disabled = true;
        organizationDelete.textContent = "削除中...";

        try {
          await apiRequest("delete-organization", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectedOrganizationId })
          });
          selectedOrganizationId = "";
          selectedAssignmentId = "";
          await loadAdminData("組織を削除しました。");
        } catch (error) {
          organizationMessage.textContent = error.message || "組織の削除に失敗しました。";
          organizationMessage.classList.add("error");
          organizationDelete.disabled = false;
          organizationDelete.textContent = "組織を削除";
        }
      });
    }

    if (assignmentForm && assignmentMessage) {
      assignmentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        assignmentMessage.className = "message";
        assignmentMessage.textContent = "";

        const formData = new FormData(assignmentForm);
        const payload = {
          id: String(formData.get("id") || "").trim(),
          fiscal_year_id: String(formData.get("fiscal_year_id") || "").trim(),
          organization_id: String(formData.get("organization_id") || "").trim(),
          member_id: String(formData.get("member_id") || "").trim(),
          role: String(formData.get("role") || "").trim(),
          sort_order: Number(formData.get("sort_order") || 0)
        };

        if (!payload.member_id) {
          assignmentMessage.textContent = "会員を選択してください。";
          assignmentMessage.classList.add("error");
          return;
        }
        if (!payload.role) {
          assignmentMessage.textContent = "役職名を入力してください。";
          assignmentMessage.classList.add("error");
          return;
        }

        try {
          const result = await apiRequest("save-org-assignment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          selectedAssignmentId = result.assignment?.id || "";
          await loadAdminData("配属を保存しました。");
        } catch (error) {
          assignmentMessage.textContent = error.message || "配属の保存に失敗しました。";
          assignmentMessage.classList.add("error");
        }
      });
    }

    if (assignmentDelete && assignmentMessage) {
      assignmentDelete.addEventListener("click", async () => {
        assignmentMessage.className = "message";
        assignmentMessage.textContent = "";
        assignmentDelete.disabled = true;
        assignmentDelete.textContent = "削除中...";

        try {
          await apiRequest("delete-org-assignment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: selectedAssignmentId })
          });
          selectedAssignmentId = "";
          await loadAdminData("配属を削除しました。");
        } catch (error) {
          assignmentMessage.textContent = error.message || "配属の削除に失敗しました。";
          assignmentMessage.classList.add("error");
          assignmentDelete.disabled = false;
          assignmentDelete.textContent = "配属を削除";
        }
      });
    }
  }

  async function loadAdminData(flashMessage = "") {
    listMessage.className = "message";
    listMessage.textContent = "読込中...";

    try {
      const query = selectedFiscalYearId ? `?fiscalYearId=${encodeURIComponent(selectedFiscalYearId)}` : "";
      const result = await apiRequest(`list-organization-chart-admin${query}`);
      fiscalYears = result.fiscal_years || [];
      organizations = result.organizations || [];
      members = result.member_options || [];
      selectedFiscalYearId = result.selected_fiscal_year?.id || result.current_fiscal_year_id || "";

      if (selectedOrganizationId && !organizations.some((organization) => organization.id === selectedOrganizationId)) {
        selectedOrganizationId = "";
      }
      if (!selectedOrganizationId) {
        selectedOrganizationId = organizations[0]?.id || "";
      }

      const selectedOrganization = organizations.find((organization) => organization.id === selectedOrganizationId);
      if (selectedAssignmentId && !selectedOrganization?.assignments?.some((assignment) => assignment.id === selectedAssignmentId)) {
        selectedAssignmentId = "";
      }

      listSlot.innerHTML = renderOrganizationRows(organizations, selectedOrganizationId);
      bindListActions();
      listMessage.textContent = organizations.length
        ? `${organizations.length}組織 / 会員候補 ${members.length}名`
        : "この年度の組織はまだありません。";
      renderDetail(flashMessage);
    } catch (error) {
      listSlot.innerHTML = '<p class="empty-state">一覧を表示できませんでした。</p>';
      detailSlot.innerHTML = '<p class="message error">組織図管理を表示できませんでした。</p>';
      listMessage.className = "message error";
      listMessage.textContent = error.message || "組織図管理の取得に失敗しました。";
    }
  }

  await loadAdminData();
}

function createEmptyFiscalYear() {
  const currentYear = new Date().getFullYear();

  return {
    id: "",
    year: currentYear,
    start_date: `${currentYear}-01-01`,
    end_date: `${currentYear}-12-31`,
    is_current: false,
    state: ""
  };
}

function renderFiscalYearRows(fiscalYears, selectedId) {
  if (!fiscalYears.length) {
    return '<p class="empty-state">年度データはまだありません。</p>';
  }

  return `
    <div class="pending-list stack-sm">
      ${fiscalYears
        .map(
          (fiscalYear) => `
            <button class="pending-item ${fiscalYear.id === selectedId ? "is-selected" : ""}" data-fiscal-year-id="${escapeHtml(fiscalYear.id)}" type="button">
              <span class="pending-date">${escapeHtml(displayValue(fiscalYear.start_date))} - ${escapeHtml(displayValue(fiscalYear.end_date))}</span>
              <strong>${escapeHtml(String(fiscalYear.year || "-"))}年度</strong>
              <span>${escapeHtml(displayValue(getFiscalYearStateLabel(fiscalYear.state)))}${fiscalYear.is_current ? " / 現在年度" : ""}</span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function getFiscalYearStateLabel(state) {
  if (state === "upcoming") {
    return "開始前";
  }
  if (state === "closed") {
    return "締了";
  }
  if (state === "open") {
    return "開放中";
  }
  return state || "-";
}

function renderFiscalYearEditor(fiscalYear, flashMessage = "") {
  const current = fiscalYear || createEmptyFiscalYear();

  return `
    <div class="detail-stack">
      <section class="detail-card stack-sm">
        <div class="detail-header-row">
          <div>

            <h2>${escapeHtml(current.id ? "年度詳細 / 編集" : "新規年度追加")}</h2>
          </div>
          <span class="pill">${escapeHtml(displayValue(current.is_current ? "現在年度" : getFiscalYearStateLabel(current.state)))}</span>
        </div>
        <p class="muted">M4 / M5 が参照する年度データの最小管理画面です。現在年度は常に 1 件だけ保持します。</p>
      </section>

      <section class="detail-card stack">
        <form id="fiscal-year-form" class="editor-form" novalidate>
          <input type="hidden" name="id" value="${escapeHtml(current.id)}" />
          <div class="editor-grid">
            <div class="field">
              <label for="fiscal-year-year">年度名</label>
              <input id="fiscal-year-year" name="year" type="number" min="2000" max="2100" value="${escapeHtml(String(current.year || ""))}" />
            </div>
            <div class="field checkbox-field">
              <label for="fiscal-year-is-current">現在年度</label>
              <input id="fiscal-year-is-current" name="is_current" type="checkbox"${current.is_current ? " checked" : ""} />
            </div>
            <div class="field">
              <label for="fiscal-year-start">開始日</label>
              <input id="fiscal-year-start" name="start_date" type="date" value="${escapeHtml(current.start_date || "")}" />
            </div>
            <div class="field">
              <label for="fiscal-year-end">終了日</label>
              <input id="fiscal-year-end" name="end_date" type="date" value="${escapeHtml(current.end_date || "")}" />
            </div>
          </div>
          <section class="detail-card stack-sm inset-card">
            <div>

              <h3>年度情報</h3>
            </div>
            <dl class="detail-grid">
              <div><dt>状態</dt><dd>${escapeHtml(displayValue(getFiscalYearStateLabel(current.state)))}</dd></div>
              <div><dt>現在年度</dt><dd>${current.is_current ? "はい" : "いいえ"}</dd></div>
              <div><dt>開始日</dt><dd>${escapeHtml(displayValue(current.start_date))}</dd></div>
              <div><dt>終了日</dt><dd>${escapeHtml(displayValue(current.end_date))}</dd></div>
            </dl>
          </section>
          <p id="fiscal-year-message" class="message ${flashMessage ? "success" : ""}" aria-live="polite">${escapeHtml(flashMessage)}</p>
          <div class="actions">
            <button id="fiscal-year-save" class="button" type="submit">保存する</button>
            ${current.id ? '<button id="fiscal-year-current" class="button ghost" type="button">現在年度にする</button>' : ""}
          </div>
        </form>
      </section>
      ${current.id && !current.is_current ? `
      <section class="detail-card stack">
        <div class="detail-header-row"><div><h3>年度切替一括処理</h3></div></div>
        <p class="muted">この年度を現在年度に切り替え、前年度から組織コピー・会費一括生成・新入フラグリセットを実行します。</p>
        <div style="margin:0.5rem 0">
          <label class="checkbox-row"><input id="transition-copy-orgs" type="checkbox" checked /><span>組織構成を前年度からコピー</span></label>
          <label class="checkbox-row"><input id="transition-generate-dues" type="checkbox" checked /><span>会費を一括生成（DueSettings の金額を適用）</span></label>
          <label class="checkbox-row"><input id="transition-reset-new" type="checkbox" checked /><span>新入会員フラグをリセット</span></label>
        </div>
        <p id="transition-message" class="message" aria-live="polite"></p>
        <div class="actions">
          <button id="fiscal-year-transition" class="button" type="button" style="background:#c53030">年度切替を実行する</button>
        </div>
      </section>
      ` : ""}
    </div>
  `;
}

async function renderAdminFiscalYears(selectedId = "") {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">年度管理</h1>
        <p class="page-description">年度の追加・編集と現在年度の切り替え</p>
      </div>
      <div class="admin-grid">
        <section class="card panel-card">
          <div class="card-body">
            <div class="panel-heading">
              <div>
    
                <h2>年度一覧</h2>
              </div>
              <div class="actions">
                <button id="fiscal-year-create" class="button ghost" type="button">新規追加</button>
              </div>
            </div>
            <p id="fiscal-year-list-message" class="message" aria-live="polite"></p>
            <div id="fiscal-year-list-slot"></div>
          </div>
        </section>
        <section class="card panel-card">
          <div class="card-body">
            <div class="panel-heading">
              <div>
    
                <h2>年度詳細</h2>
              </div>
              
            </div>
            <div id="fiscal-year-detail-slot"></div>
          </div>
        </section>
      </div>
    </section>
  `);

  const listMessage = document.getElementById("fiscal-year-list-message");
  const listSlot = document.getElementById("fiscal-year-list-slot");
  const detailSlot = document.getElementById("fiscal-year-detail-slot");
  const createButton = document.getElementById("fiscal-year-create");

  let fiscalYears = [];
  let activeId = selectedId || "";

  async function loadDetail(id) {
    const flashMessage = sessionStorage.getItem("fiscal-year-message") || "";
    sessionStorage.removeItem("fiscal-year-message");

    if (!id) {
      detailSlot.innerHTML = renderFiscalYearEditor(createEmptyFiscalYear(), flashMessage);
      bindFiscalYearForm();
      return;
    }

    const selectedFiscalYear = fiscalYears.find((fiscalYear) => fiscalYear.id === id) || createEmptyFiscalYear();
    detailSlot.innerHTML = renderFiscalYearEditor(selectedFiscalYear, flashMessage);
    bindFiscalYearForm(selectedFiscalYear.id);
  }

  function bindListActions() {
    listSlot.querySelectorAll("[data-fiscal-year-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        activeId = button.dataset.fiscalYearId || "";
        listSlot.innerHTML = renderFiscalYearRows(fiscalYears, activeId);
        bindListActions();
        await loadDetail(activeId);
      });
    });
  }

  function bindFiscalYearForm(currentId = "") {
    const form = document.getElementById("fiscal-year-form");
    const message = document.getElementById("fiscal-year-message");
    const saveButton = document.getElementById("fiscal-year-save");
    const currentButton = document.getElementById("fiscal-year-current");

    if (!form || !message || !saveButton) {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      message.className = "message";
      message.textContent = "";

      const formData = new FormData(form);
      const payload = {
        id: String(formData.get("id") || "").trim(),
        year: Number(formData.get("year") || 0),
        start_date: String(formData.get("start_date") || "").trim(),
        end_date: String(formData.get("end_date") || "").trim(),
        is_current: formData.get("is_current") === "on"
      };

      if (!payload.year) {
        message.textContent = "年度名を入力してください。";
        message.classList.add("error");
        return;
      }

      if (!payload.start_date || !payload.end_date) {
        message.textContent = "開始日と終了日を入力してください。";
        message.classList.add("error");
        return;
      }

      saveButton.disabled = true;
      saveButton.textContent = "保存中...";

      try {
        const result = await apiRequest("save-fiscal-year", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        sessionStorage.setItem("fiscal-year-message", "年度を保存しました。");
        await renderAdminFiscalYears(result.fiscal_year?.id || currentId || "");
      } catch (error) {
        message.textContent = error.message || "保存に失敗しました。";
        message.classList.add("error");
        saveButton.disabled = false;
        saveButton.textContent = "保存する";
      }
    });

    if (currentButton) {
      currentButton.addEventListener("click", async () => {
        message.className = "message";
        message.textContent = "";
        currentButton.disabled = true;
        currentButton.textContent = "切替中...";

        try {
          await apiRequest("set-current-fiscal-year", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: currentId })
          });
          sessionStorage.setItem("fiscal-year-message", "現在年度を切り替えました。");
          await renderAdminFiscalYears(currentId);
        } catch (error) {
          message.textContent = error.message || "現在年度の切替に失敗しました。";
          message.classList.add("error");
          currentButton.disabled = false;
          currentButton.textContent = "現在年度にする";
        }
      });
    }

    const transitionButton = document.getElementById("fiscal-year-transition");
    const transitionMessage = document.getElementById("transition-message");
    if (transitionButton && transitionMessage && currentId) {
      transitionButton.addEventListener("click", async () => {
        if (!confirm("年度切替一括処理を実行しますか？\nこの操作は取り消せません。")) return;
        transitionMessage.className = "message";
        transitionMessage.textContent = "";
        transitionButton.disabled = true;
        transitionButton.textContent = "処理中...";

        const copyOrgs = document.getElementById("transition-copy-orgs")?.checked ?? true;
        const generateDues = document.getElementById("transition-generate-dues")?.checked ?? true;
        const resetIsNew = document.getElementById("transition-reset-new")?.checked ?? true;

        try {
          const result = await apiRequest("execute-fiscal-year-transition", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              new_fiscal_year_id: currentId,
              copy_organizations: copyOrgs,
              generate_dues: generateDues,
              reset_is_new: resetIsNew
            })
          });
          const logText = (result.log || []).join("\n");
          sessionStorage.setItem("fiscal-year-message", "年度切替が完了しました。\n" + logText);
          await renderAdminFiscalYears(currentId);
        } catch (error) {
          transitionMessage.textContent = error.message || "年度切替に失敗しました。";
          transitionMessage.classList.add("error");
          transitionButton.disabled = false;
          transitionButton.textContent = "年度切替を実行する";
        }
      });
    }
  }

  async function loadFiscalYears() {
    listMessage.className = "message";
    listMessage.textContent = "読込中...";

    try {
      const result = await apiRequest("list-fiscal-years-admin");
      fiscalYears = result.fiscal_years || [];

      if (activeId && !fiscalYears.some((fiscalYear) => fiscalYear.id === activeId)) {
        activeId = "";
      }
      if (!activeId) {
        activeId = result.current_fiscal_year_id || "";
      }

      listSlot.innerHTML = renderFiscalYearRows(fiscalYears, activeId);
      bindListActions();
      listMessage.textContent = fiscalYears.length
        ? `${fiscalYears.length}件を表示中 / 現在年度は 1 件のみ`
        : "年度データはまだありません。";
      await loadDetail(activeId);
    } catch (error) {
      listSlot.innerHTML = '<p class="empty-state">一覧を表示できませんでした。</p>';
      detailSlot.innerHTML = '<p class="message error">年度詳細を表示できませんでした。</p>';
      listMessage.className = "message error";
      listMessage.textContent = error.message || "年度一覧の取得に失敗しました。";
    }
  }

  createButton.addEventListener("click", async () => {
    activeId = "";
    listSlot.innerHTML = renderFiscalYearRows(fiscalYears, activeId);
    bindListActions();
    sessionStorage.removeItem("fiscal-year-message");
    await loadDetail("");
  });

  await loadFiscalYears();
}

function renderDashboardNewsletterRows(newsletters) {
  if (!newsletters.length) {
    return '<p class="empty-state">配信履歴はまだありません。</p>';
  }

  return `
    <div class="pending-list stack-sm">
      ${newsletters
        .map(
          (newsletter) => `
            <article class="basic-info-document">
              <div class="panel-heading compact">
                <div>
                  <h3>${escapeHtml(displayValue(newsletter.title || "無題"))}</h3>
                  <span class="muted">${escapeHtml(displayValue(newsletter.channel || "-"))}</span>
                </div>
                <span class="pill">${escapeHtml(displayValue(newsletter.status || "-"))}</span>
              </div>
              <p class="muted">${escapeHtml(displayValue(newsletter.updated_at ? newsletter.updated_at.slice(0, 10) : "-"))}</p>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

// Admin UI rule:
// - Dashboard and Settings are hub screens and may keep in-body navigation.
// - Other admin screens are work screens and should avoid generic in-body links.
// - Work screens may keep one subtle back link only when it has clear list/detail meaning.
function renderAdminDashboardPage(data) {
  const currentFiscalYear = data.current_fiscal_year || null;
  const memberSummary = data.member_summary || {};
  const dueSummary = data.due_summary || {};
  const recentNewsletters = data.recent_newsletters || [];
  const dueRate = dueSummary.total_count
    ? Math.round((Number(dueSummary.paid_count || 0) / Number(dueSummary.total_count || 1)) * 100)
    : 0;

  return `
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">ダッシュボード</h1>
        <p class="page-description">主要指標と管理導線を確認</p>
      </div>

      <section class="card panel-card single-panel">
        <div class="card-body stack">
          <div class="panel-heading"><div><h2>概要</h2></div></div>

          <div class="dashboard-grid">
            <section class="detail-card stack-sm accent-warning">
              <div class="panel-heading compact">
                <div>
                  <h3>未承認申込</h3>
                </div>
                <span class="pill">${escapeHtml(String(data.pending_application_count || 0))}件</span>
              </div>
              <p class="muted">確認が必要な申込件数です。</p>
              <div class="actions"><a class="text-link" href="/admin/applications">申込管理</a></div>
            </section>

            <section class="detail-card stack-sm accent-info">
              <div class="panel-heading compact">
                <div>
                  <h3>${escapeHtml(currentFiscalYear?.year ? `${currentFiscalYear.year}年度会費` : "当年度会費")}</h3>
                </div>
                <span class="pill">${escapeHtml(String(dueRate))}%</span>
              </div>
              <div class="progress-track" aria-hidden="true">
                <div class="progress-fill" style="width: ${Math.max(0, Math.min(100, dueRate))}%"></div>
              </div>
              <p class="muted">${escapeHtml(String(dueSummary.paid_count || 0))} / ${escapeHtml(String(dueSummary.total_count || 0))} 件が納入済です。</p>
              <div class="actions"><a class="text-link" href="/admin/dues-management">会費管理</a></div>
            </section>
          </div>

          <section class="detail-card stack-sm">
            <div class="panel-heading compact">
              <div>

                <h3>会員数サマリー</h3>
              </div>
            </div>
            <div class="dashboard-metrics">
              <article class="metric-card">
                <span class="metric-label">正会員</span>
                <strong>${escapeHtml(String(memberSummary.regular_count || 0))}</strong>
              </article>
              <article class="metric-card">
                <span class="metric-label">賛助会員</span>
                <strong>${escapeHtml(String(memberSummary.supporting_count || 0))}</strong>
              </article>
              <article class="metric-card">
                <span class="metric-label">OB会員</span>
                <strong>${escapeHtml(String(memberSummary.ob_count || 0))}</strong>
              </article>
              <article class="metric-card">
                <span class="metric-label">休会</span>
                <strong>${escapeHtml(String(memberSummary.paused_count || 0))}</strong>
              </article>
              <article class="metric-card">
                <span class="metric-label">新入</span>
                <strong>${escapeHtml(String(memberSummary.new_count || 0))}</strong>
              </article>
            </div>
          </section>

          <section class="detail-card stack-sm">
            <div class="panel-heading compact">
              <div>

                <h3>直近配信5件</h3>
              </div>
            </div>
            ${renderDashboardNewsletterRows(recentNewsletters)}
          </section>

          <section class="detail-card stack-sm">
            <div class="panel-heading compact">
              <div>
                <h3>クイックアクション</h3>
              </div>
            </div>
            <div class="dashboard-metrics">
              <a class="metric-card" href="/admin/members"><strong>会員一覧</strong></a>
              <a class="metric-card" href="/admin/applications"><strong>申込管理</strong></a>
              <a class="metric-card" href="/admin/dues-management"><strong>会費管理</strong></a>
              <a class="metric-card" href="/admin/organization-chart"><strong>組織図管理</strong></a>
              <a class="metric-card" href="/admin/newsletters"><strong>配信管理</strong></a>
            </div>
          </section>
        </div>
      </section>
    </section>
  `;
}

async function renderAdminDashboard() {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">ダッシュボード</h1>
        <p class="page-description">主要指標と管理導線を確認</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body">
          <div class="loading-state"><div class="spinner"></div><p>読み込み中...</p></div>
        </div>
      </section>
    </section>
  `);

  try {
    const result = await apiRequest("get-admin-dashboard");
    setView(renderAdminDashboardPage(result));
  } catch (error) {
    setView(`
      <section class="admin-shell">
        <div class="page-header">
          <h1 class="page-title">ダッシュボード</h1>
          <p class="page-description">主要指標と管理導線を確認</p>
        </div>
        <section class="card panel-card single-panel">
          <div class="card-body">
            <p class="message error">${escapeHtml(error.message || "ダッシュボードの取得に失敗しました。")}</p>
          </div>
        </section>
      </section>
    `);
  }
}

async function renderAdminSettings() {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">設定</h1>
        <p class="page-description">アプリ基本設定と管理者アカウント管理</p>
      </div>
      <section class="card panel-card single-panel">
        <div class="card-body">
          <div class="loading-state"><div class="spinner"></div><p>読み込み中...</p></div>
        </div>
      </section>
    </section>
  `);

  let adminMembers = [];
  try {
    const result = await apiRequest("list-admin-members");
    adminMembers = result.members || [];
  } catch { /* silent */ }

  const admins = adminMembers.filter((m) => m.role === "admin");
  const nonAdmins = adminMembers.filter((m) => m.role !== "admin");

  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">設定</h1>
        <p class="page-description">アプリ基本設定と管理者アカウント管理</p>
      </div>

      <div class="settings-grid">
        <section class="card panel-card">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>管理画面へのリンク</h2></div></div>
            <div class="dashboard-metrics">
              <a class="metric-card" href="/admin/fiscal-years"><span class="metric-label">年度設定</span><strong>年度管理</strong></a>
              <a class="metric-card" href="/admin/dues-management"><span class="metric-label">会費設定</span><strong>会費管理</strong></a>
              <a class="metric-card" href="/admin/documents"><span class="metric-label">資料設定</span><strong>資料管理</strong></a>
              <a class="metric-card" href="/admin/newsletters"><span class="metric-label">通知設定</span><strong>配信管理</strong></a>
              <a class="metric-card" href="/admin/applications"><span class="metric-label">申込管理</span><strong>入会申込</strong></a>
              <a class="metric-card" href="/admin/organization-chart"><span class="metric-label">組織設定</span><strong>組織図管理</strong></a>
            </div>
          </div>
        </section>

        <section class="card panel-card">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>メール配信設定</h2></div></div>
            <dl class="detail-grid">
              <div><dt>配信エンジン</dt><dd>Resend API</dd></div>
              <div><dt>送信元</dt><dd>環境変数 RESEND_FROM_EMAIL で設定</dd></div>
              <div><dt>APIキー</dt><dd>環境変数 RESEND_API_KEY で設定</dd></div>
              <div><dt>ステータス</dt><dd><span class="pill pill-success">設定済み（Base44 Secrets）</span></dd></div>
            </dl>
          </div>
        </section>

        <section class="card panel-card">
          <div class="card-body stack">
            <div class="panel-heading"><div><h2>LINE連携設定</h2></div></div>
            <div class="detail-card inset-card stack-sm">
              <span class="pill pill-warning">準備中</span>
              <p class="muted">LINE Messaging API との連携は後フェーズで実装予定です。Channel Access Token の設定はこのセクションで行います。</p>
            </div>
          </div>
        </section>

        <section class="card panel-card">
          <div class="card-body stack">
            <div class="panel-heading">
              <div><h2>管理者アカウント</h2></div>
              <span class="pill">${admins.length}名</span>
            </div>
            <p class="muted">role=admin の会員に管理画面へのアクセス権限が付与されます。</p>
            <p id="admin-role-message" class="message" aria-live="polite"></p>

            ${admins.length ? `
              <div class="panel-heading compact"><div><h3>管理者一覧</h3></div></div>
              <div class="pending-list stack-sm">
                ${admins.map((m) => `
                  <div class="pending-item" style="cursor:default">
                    <div>
                      <strong>${escapeHtml(m.name_kanji)}</strong>
                      <span class="muted">${escapeHtml(m.email)} / ${escapeHtml(m.member_number || "-")}</span>
                    </div>
                    <button class="button ghost toggle-role-btn" data-member-id="${escapeHtml(m.id)}" data-new-role="member" type="button" style="font-size:12px;color:#c53030">権限剥奪</button>
                  </div>
                `).join("")}
              </div>
            ` : '<p class="empty-state">管理者が設定されていません。</p>'}

            <div class="panel-heading compact"><div><h3>会員から管理者を追加</h3></div></div>
            <div class="field">
              <select id="add-admin-select">
                <option value="">会員を選択...</option>
                ${nonAdmins.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.name_kanji)} (${escapeHtml(m.member_number || "-")})</option>`).join("")}
              </select>
            </div>
            <div class="actions">
              <button id="add-admin-btn" class="button ghost" type="button">管理者権限を付与</button>
            </div>
          </div>
        </section>
      </div>
    </section>
  `);

  // Bind role toggle actions
  const roleMessage = document.getElementById("admin-role-message");

  document.querySelectorAll(".toggle-role-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const memberId = btn.dataset.memberId;
      const newRole = btn.dataset.newRole;
      if (!confirm(newRole === "member" ? "この会員の管理者権限を剥奪しますか？" : "この会員に管理者権限を付与しますか？")) return;
      btn.disabled = true;
      try {
        await apiRequest("toggle-member-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ member_id: memberId, role: newRole })
        });
        showToast(newRole === "admin" ? "管理者権限を付与しました" : "管理者権限を剥奪しました");
        await renderAdminSettings();
      } catch (error) {
        if (roleMessage) { roleMessage.textContent = error.message || "変更に失敗しました。"; roleMessage.className = "message error"; }
        btn.disabled = false;
      }
    });
  });

  const addAdminBtn = document.getElementById("add-admin-btn");
  const addAdminSelect = document.getElementById("add-admin-select");
  if (addAdminBtn && addAdminSelect) {
    addAdminBtn.addEventListener("click", async () => {
      const memberId = addAdminSelect.value;
      if (!memberId) { if (roleMessage) { roleMessage.textContent = "会員を選択してください。"; roleMessage.className = "message error"; } return; }
      if (!confirm("この会員に管理者権限を付与しますか？")) return;
      addAdminBtn.disabled = true;
      try {
        await apiRequest("toggle-member-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ member_id: memberId, role: "admin" })
        });
        showToast("管理者権限を付与しました");
        await renderAdminSettings();
      } catch (error) {
        if (roleMessage) { roleMessage.textContent = error.message || "変更に失敗しました。"; roleMessage.className = "message error"; }
        addAdminBtn.disabled = false;
      }
    });
  }
}

async function renderAdminApplications() {
  setView(`
    <section class="admin-shell">
      <div class="page-header">
        <h1 class="page-title">入会申込管理</h1>
        <p class="page-description">申請中の入会申込を確認・承認・却下</p>
      </div>
      <div class="admin-grid">
        <section class="card panel-card">
          <div class="card-body">
            <div class="panel-heading">
              <div><h2>申請中一覧</h2></div>
              <div class="actions">
                <button id="reload-pending" class="button ghost" type="button">再読込</button>
              </div>
            </div>
            <p id="list-message" class="message" aria-live="polite"></p>
            <div id="pending-list-slot"></div>
          </div>
        </section>
        <section class="card panel-card">
          <div class="card-body">
            <div class="panel-heading"><div><h2>申込詳細</h2></div></div>
            <div id="detail-slot"></div>
          </div>
        </section>
      </div>
    </section>
  `);

  const listMessage = document.getElementById("list-message");
  const pendingListSlot = document.getElementById("pending-list-slot");
  const detailSlot = document.getElementById("detail-slot");
  const reloadButton = document.getElementById("reload-pending");

  let pendingMembers = [];
  let selectedId = "";

  async function loadDetail(id) {
    if (!id) {
      detailSlot.innerHTML = renderMemberDetail(null);
      return;
    }

    detailSlot.innerHTML = '<p class="message">詳細を読み込んでいます...</p>';

    try {
      const detail = await apiRequest(`get-member-detail?id=${encodeURIComponent(id)}`);
      detailSlot.innerHTML = renderMemberDetail(detail);
      bindDetailActions();
    } catch (error) {
      detailSlot.innerHTML = `<p class="message error">${escapeHtml(error.message)}</p>`;
    }
  }

  function bindListActions() {
    pendingListSlot.querySelectorAll("[data-member-id]").forEach((button) => {
      button.addEventListener("click", async () => {
        selectedId = button.dataset.memberId || "";
        pendingListSlot.innerHTML = renderPendingList(pendingMembers, selectedId);
        bindListActions();
        await loadDetail(selectedId);
      });
    });
  }

  function bindDetailActions() {
    const approveForm = document.getElementById("approve-form");
    const rejectForm = document.getElementById("reject-form");
    const adminMessage = document.getElementById("admin-message");

    if (!approveForm || !rejectForm || !adminMessage) {
      return;
    }

    // Auto-generate member number
    const memberNumberInput = document.getElementById("member_number");
    const autoNumberBtn = document.getElementById("auto-number-btn");
    const autoNumberHint = document.getElementById("auto-number-hint");

    async function fetchSuggestedNumber() {
      try {
        const result = await apiRequest("generate-member-number");
        if (memberNumberInput && !memberNumberInput.value) {
          memberNumberInput.value = result.suggested_number || "";
        }
        if (autoNumberHint) {
          autoNumberHint.textContent = `${result.fiscal_year}年度: ${result.prefix}*** (次: ${result.next_sequence})`;
        }
      } catch { /* silent */ }
    }
    fetchSuggestedNumber();

    if (autoNumberBtn) {
      autoNumberBtn.addEventListener("click", async () => {
        autoNumberBtn.disabled = true;
        autoNumberBtn.textContent = "取得中...";
        try {
          const result = await apiRequest("generate-member-number");
          if (memberNumberInput) memberNumberInput.value = result.suggested_number || "";
          if (autoNumberHint) autoNumberHint.textContent = `${result.fiscal_year}年度: ${result.prefix}*** (次: ${result.next_sequence})`;
        } catch { /* silent */ }
        autoNumberBtn.disabled = false;
        autoNumberBtn.textContent = "自動採番";
      });
    }

    approveForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      adminMessage.className = "message";
      adminMessage.textContent = "";
      const formData = new FormData(approveForm);

      const payload = {
        id: String(formData.get("id") || ""),
        member_type: String(formData.get("member_type") || ""),
        member_number: String(formData.get("member_number") || "").trim()
      };

      if (!payload.member_number) {
        adminMessage.textContent = "会員番号を入力してください。";
        adminMessage.classList.add("error");
        return;
      }

      try {
        await apiRequest("approve-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        adminMessage.textContent = "承認しました。";
        adminMessage.classList.add("success");
        await loadPendingMembers();
      } catch (error) {
        adminMessage.textContent = error.message || "承認に失敗しました。";
        adminMessage.classList.add("error");
      }
    });

    rejectForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      adminMessage.className = "message";
      adminMessage.textContent = "";
      const formData = new FormData(rejectForm);

      const payload = {
        id: String(formData.get("id") || ""),
        rejection_reason: String(formData.get("rejection_reason") || "").trim()
      };

      if (!payload.rejection_reason) {
        adminMessage.textContent = "却下理由を入力してください。";
        adminMessage.classList.add("error");
        return;
      }

      try {
        await apiRequest("reject-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        adminMessage.textContent = "却下しました。";
        adminMessage.classList.add("success");
        await loadPendingMembers();
      } catch (error) {
        adminMessage.textContent = error.message || "却下に失敗しました。";
        adminMessage.classList.add("error");
      }
    });
  }

  async function loadPendingMembers() {
    listMessage.className = "message";
    listMessage.textContent = "読込中...";

    try {
      const result = await apiRequest("list-pending-members");
      pendingMembers = result.members || [];

      if (selectedId && !pendingMembers.some((member) => member.id === selectedId)) {
        selectedId = pendingMembers[0]?.id || "";
      }

      if (!selectedId) {
        selectedId = pendingMembers[0]?.id || "";
      }

      pendingListSlot.innerHTML = renderPendingList(pendingMembers, selectedId);
      bindListActions();
      listMessage.textContent = pendingMembers.length
        ? `${pendingMembers.length}件の申請中申込があります。`
        : "申請中の申込はありません。";
      if (pendingMembers.length) {
        await loadDetail(selectedId);
      } else {
        detailSlot.innerHTML = renderMemberDetail(null);
      }
    } catch (error) {
      listMessage.classList.add("error");
      listMessage.textContent = error.message || "一覧の取得に失敗しました。";
      detailSlot.innerHTML = renderMemberDetail(null);
    }
  }

  reloadButton.addEventListener("click", loadPendingMembers);
  await loadPendingMembers();
}

function route() {
  if (window.location.pathname === "/") {
    renderPublicHome();
    return;
  }

  if (window.location.pathname === "/apply") {
    renderApplyFormRoute();
    return;
  }

  if (window.location.pathname === "/apply/confirm") {
    renderApplyConfirmRoute();
    return;
  }

  if (window.location.pathname === "/apply/complete" || window.location.pathname === "/complete") {
    renderApplyCompleteRoute();
    return;
  }

  if (window.location.pathname === "/admin/applications") {
    renderAdminApplications();
    return;
  }

  if (window.location.pathname === "/admin" || window.location.pathname === "/admin/dashboard") {
    renderAdminDashboard();
    return;
  }

  if (window.location.pathname === "/admin/members") {
    renderAdminMembers();
    return;
  }

  if (window.location.pathname === "/admin/delivery" || window.location.pathname === "/admin/newsletters") {
    renderAdminNewsletters();
    return;
  }

  if (window.location.pathname === "/admin/dues" || window.location.pathname === "/admin/dues-management") {
    renderAdminDuesManagement();
    return;
  }

  if (window.location.pathname === "/admin/fiscal-years") {
    renderAdminFiscalYears();
    return;
  }

  if (window.location.pathname === "/admin/settings") {
    renderAdminSettings();
    return;
  }

  if (window.location.pathname === "/admin/organization" || window.location.pathname === "/admin/organization-chart") {
    renderAdminOrganizationChart();
    return;
  }

  if (window.location.pathname === "/admin/documents") {
    renderAdminDocuments();
    return;
  }

  if (window.location.pathname.startsWith("/admin/members/")) {
    const memberId = window.location.pathname.split("/").pop();
    renderAdminMemberDetail(memberId || "");
    return;
  }

  if (window.location.pathname === "/mypage") {
    renderMyPageRoute();
    return;
  }

  if (window.location.pathname === "/info") {
    renderBasicInfoRoute();
    return;
  }

  if (window.location.pathname === "/organization") {
    renderOrganizationRoute();
    return;
  }

  if (window.location.pathname === "/manual") {
    renderManualRoute();
    return;
  }

  if (window.location.pathname === "/directory") {
    renderDirectoryMembers();
    return;
  }

  if (window.location.pathname.startsWith("/directory/members/")) {
    const memberId = window.location.pathname.split("/").pop();
    renderDirectoryMemberDetail(memberId || "");
    return;
  }

  renderPublicHome();
}

route();



