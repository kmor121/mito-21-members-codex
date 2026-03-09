import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function matchesQuery(member: Record<string, unknown>, query: string) {
  if (!query) return true;

  const visibleCompanyName = member.show_company_in_directory
    ? String(member.company_name || "")
    : "";

  const haystacks = [
    String(member.name_kanji || ""),
    String(member.name_kana || ""),
    visibleCompanyName
  ].map((v) => v.toLowerCase()).filter(Boolean);

  return haystacks.some((v) => v.includes(query));
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const query = normalize(url.searchParams.get("q")).toLowerCase();
    const orgFilter = normalize(url.searchParams.get("organization_id"));
    const base44 = createClientFromRequest(req);

    // Fetch members, current fiscal year, and org data in parallel
    const [members, fiscalYears, organizations, assignments] = await Promise.all([
      base44.asServiceRole.entities.Member.filter(
        { approval_status: "承認済", status: "活動中" },
        "name_kanji", 500, 0
      ),
      base44.asServiceRole.entities.FiscalYear.list(),
      base44.asServiceRole.entities.Organization.list(),
      base44.asServiceRole.entities.OrgAssignment.list()
    ]);

    const currentFy = fiscalYears.find((fy) => fy.is_current === true);
    const currentFyId = currentFy?.id || "";

    // Build org name map
    const orgMap = new Map<string, string>();
    for (const org of organizations) {
      orgMap.set(org.id, String(org.org_name || ""));
    }

    // Build member -> assignments map for current fiscal year
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

    // Build unique org list for filter options
    const orgOptions = [...new Set(
      assignments
        .filter((a) => String(a.fiscal_year_id || "") === currentFyId)
        .map((a) => String(a.organization_id || ""))
    )].map((orgId) => ({ id: orgId, name: orgMap.get(orgId) || "" }))
     .filter((o) => o.name)
     .sort((a, b) => a.name.localeCompare(b.name, "ja"));

    // Filter by organization if specified
    let memberIdsInOrg: Set<string> | null = null;
    if (orgFilter) {
      memberIdsInOrg = new Set(
        assignments
          .filter((a) => String(a.fiscal_year_id || "") === currentFyId && String(a.organization_id || "") === orgFilter)
          .map((a) => String(a.member_id || ""))
      );
    }

    const directoryMembers = members
      .filter((member) => matchesQuery(member, query))
      .filter((member) => !memberIdsInOrg || memberIdsInOrg.has(member.id))
      .sort((left, right) => {
        const l = String(left.name_kanji || "");
        const r = String(right.name_kanji || "");
        return l.localeCompare(r, "ja");
      })
      .map((member) => {
        const assigns = memberAssignments.get(member.id) || [];
        return {
          id: member.id,
          name_kanji: member.name_kanji || "",
          member_type: member.member_type || "",
          profile_image: member.profile_image || "",
          company_name: member.show_company_in_directory ? member.company_name || "" : "",
          company_position: member.show_company_in_directory ? member.company_position || "" : "",
          email: member.show_email_in_directory ? member.email || "" : "",
          mobile_phone: member.show_mobile_in_directory ? member.mobile_phone || "" : "",
          org_assignments: assigns
        };
      });

    return Response.json({
      ok: true,
      sort: "name_kanji_asc",
      members: directoryMembers,
      org_options: orgOptions
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
