import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { target_fiscal_year_id } = await req.json();

    if (!target_fiscal_year_id) {
      return Response.json({ ok: false, error: "target_fiscal_year_id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Get all fiscal years to find the previous year
    const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
    const targetFy = fiscalYears.find((fy) => fy.id === target_fiscal_year_id);
    if (!targetFy) {
      return Response.json({ ok: false, error: "対象年度が見つかりません" }, { status: 404 });
    }

    // Find previous year (sort by year descending, find the one just before target)
    const sorted = fiscalYears.sort((a, b) => Number(b.year) - Number(a.year));
    const targetYear = Number(targetFy.year);
    const prevFy = sorted.find((fy) => Number(fy.year) < targetYear);

    if (!prevFy) {
      return Response.json({ ok: false, error: "前年度が見つかりません" }, { status: 400 });
    }

    // Check if target year already has organizations
    const existingOrgs = await base44.asServiceRole.entities.Organization.filter(
      { fiscal_year_id: target_fiscal_year_id }
    );
    if (existingOrgs.length > 0) {
      return Response.json({ ok: false, error: "対象年度には既に組織が存在します。先に削除してください。" }, { status: 400 });
    }

    // Get previous year's orgs and assignments
    const [prevOrgs, prevAssignments] = await Promise.all([
      base44.asServiceRole.entities.Organization.filter({ fiscal_year_id: prevFy.id }),
      base44.asServiceRole.entities.OrgAssignment.filter({ fiscal_year_id: prevFy.id })
    ]);

    if (prevOrgs.length === 0) {
      return Response.json({ ok: false, error: `前年度(${prevFy.year})に組織がありません` }, { status: 400 });
    }

    // Pass 1: Create orgs without parent_id
    const oldToNewId = new Map<string, string>();
    for (const org of prevOrgs) {
      const newOrg = await base44.asServiceRole.entities.Organization.create({
        fiscal_year_id: target_fiscal_year_id,
        org_name: org.org_name || "",
        org_type: org.org_type || "その他",
        sort_order: org.sort_order || 0
      });
      oldToNewId.set(org.id, newOrg.id);
    }

    // Pass 2: Set parent_id references
    for (const org of prevOrgs) {
      if (org.parent_id && oldToNewId.has(org.parent_id)) {
        const newId = oldToNewId.get(org.id)!;
        const newParentId = oldToNewId.get(org.parent_id)!;
        await base44.asServiceRole.entities.Organization.update(newId, { parent_id: newParentId });
      }
    }

    // Copy assignments
    let assignmentCount = 0;
    for (const a of prevAssignments) {
      const newOrgId = oldToNewId.get(String(a.organization_id || ""));
      if (!newOrgId) continue;
      await base44.asServiceRole.entities.OrgAssignment.create({
        fiscal_year_id: target_fiscal_year_id,
        organization_id: newOrgId,
        member_id: a.member_id || "",
        role: a.role || "",
        sort_order: a.sort_order || 0
      });
      assignmentCount++;
    }

    return Response.json({
      ok: true,
      message: `${prevFy.year}年度から${prevOrgs.length}組織・${assignmentCount}配属をコピーしました。`,
      organizations_copied: prevOrgs.length,
      assignments_copied: assignmentCount
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
