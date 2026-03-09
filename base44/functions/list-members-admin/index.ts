import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function matchesQuery(member: Record<string, unknown>, query: string) {
  if (!query) return true;

  const haystacks = [
    member.name_kanji,
    member.name_kana,
    member.company_name,
    member.email,
    member.member_number
  ].filter((v) => typeof v === "string")
   .map((v) => String(v).toLowerCase());

  return haystacks.some((v) => v.includes(query));
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const query = normalize(url.searchParams.get("q")).toLowerCase();
    const status = normalize(url.searchParams.get("status"));
    const memberType = normalize(url.searchParams.get("member_type"));
    const approvalStatus = normalize(url.searchParams.get("approval_status"));
    const orgFilter = normalize(url.searchParams.get("organization_id"));

    const base44 = createClientFromRequest(req);

    const [allMembers, fiscalYears, organizations, assignments] = await Promise.all([
      base44.asServiceRole.entities.Member.list(),
      base44.asServiceRole.entities.FiscalYear.list(),
      base44.asServiceRole.entities.Organization.list(),
      base44.asServiceRole.entities.OrgAssignment.list()
    ]);

    const currentFy = fiscalYears.find((fy) => fy.is_current === true);
    const currentFyId = currentFy?.id || "";

    const orgMap = new Map<string, string>();
    for (const org of organizations) {
      orgMap.set(org.id, String(org.org_name || ""));
    }

    // Build member -> assignments map for current FY
    const memberAssignments = new Map<string, Array<{ org_name: string; org_id: string; role: string }>>();
    for (const a of assignments) {
      if (String(a.fiscal_year_id || "") !== currentFyId) continue;
      const memberId = String(a.member_id || "");
      if (!memberAssignments.has(memberId)) memberAssignments.set(memberId, []);
      memberAssignments.get(memberId)!.push({
        org_name: orgMap.get(String(a.organization_id || "")) || "",
        org_id: String(a.organization_id || ""),
        role: String(a.role || "")
      });
    }

    // Filter by org if specified
    let memberIdsInOrg: Set<string> | null = null;
    if (orgFilter) {
      memberIdsInOrg = new Set(
        assignments
          .filter((a) => String(a.fiscal_year_id || "") === currentFyId && String(a.organization_id || "") === orgFilter)
          .map((a) => String(a.member_id || ""))
      );
    }

    // Org options for filter dropdown
    const orgOptions = [...new Set(
      assignments
        .filter((a) => String(a.fiscal_year_id || "") === currentFyId)
        .map((a) => String(a.organization_id || ""))
    )].map((orgId) => ({ id: orgId, name: orgMap.get(orgId) || "" }))
     .filter((o) => o.name)
     .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    const members = allMembers
      .filter((member) => matchesQuery(member, query))
      .filter((member) => !status || member.status === status)
      .filter((member) => !memberType || member.member_type === memberType)
      .filter((member) => !approvalStatus || member.approval_status === approvalStatus)
      .filter((member) => !memberIdsInOrg || memberIdsInOrg.has(member.id))
      .sort((left, right) => {
        const l = String(left.name_kanji || "");
        const r = String(right.name_kanji || "");
        return l.localeCompare(r, "ja");
      })
      .map((member) => ({
        ...member,
        org_assignments: memberAssignments.get(member.id) || []
      }));

    return Response.json({
      ok: true,
      sort: "name_kanji_asc",
      members,
      org_options: orgOptions
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
