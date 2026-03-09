import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function rolePriority(role: unknown) {
  const normalized = String(role || "").trim();
  const priorities: Record<string, number> = {
    "\u4f1a\u9577": 10,
    "\u526f\u4f1a\u9577": 20,
    "\u7406\u4e8b\u9577": 30,
    "\u526f\u7406\u4e8b\u9577": 40,
    "\u59d4\u54e1\u9577": 50,
    "\u526f\u59d4\u54e1\u9577": 60,
    "\u90e8\u4f1a\u9577": 70,
    "\u526f\u90e8\u4f1a\u9577": 80,
    "\u5e79\u4e8b": 90,
    "\u59d4\u54e1": 100,
    "\u30e1\u30f3\u30d0\u30fc": 110
  };
  return priorities[normalized] || 999;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const requestedFiscalYearId = normalize(url.searchParams.get("fiscalYearId"));
    const base44 = createClientFromRequest(req);

    const [fiscalYears, organizations, assignments, members] = await Promise.all([
      base44.asServiceRole.entities.FiscalYear.list(),
      base44.asServiceRole.entities.Organization.list(),
      base44.asServiceRole.entities.OrgAssignment.list(),
      base44.asServiceRole.entities.Member.list()
    ]);

    const years = fiscalYears
      .map((fiscalYear) => ({
        id: fiscalYear.id,
        year: Number(fiscalYear.year || 0),
        start_date: String(fiscalYear.start_date || ""),
        end_date: String(fiscalYear.end_date || ""),
        is_current: fiscalYear.is_current === true
      }))
      .filter((fiscalYear) => fiscalYear.year > 0)
      .sort((left, right) => right.year - left.year);

    const currentFiscalYear = years.find((fiscalYear) => fiscalYear.is_current) || years[0] || null;
    const selectedFiscalYear =
      years.find((fiscalYear) => fiscalYear.id === requestedFiscalYearId) ||
      currentFiscalYear;
    const selectedFiscalYearId = selectedFiscalYear?.id || "";

    const memberOptions = members
      .filter((member) => member.approval_status === "\u627f\u8a8d\u6e08")
      .filter((member) => member.status === "\u6d3b\u52d5\u4e2d")
      .map((member) => ({
        id: member.id,
        name_kanji: String(member.name_kanji || ""),
        member_type: String(member.member_type || ""),
        company_name: String(member.company_name || "")
      }))
      .sort((left, right) => left.name_kanji.localeCompare(right.name_kanji, "ja"));

    const organizationsForYear = organizations
      .filter((organization) => String(organization.fiscal_year_id || "") === selectedFiscalYearId)
      .map((organization) => ({
        id: organization.id,
        fiscal_year_id: String(organization.fiscal_year_id || ""),
        org_name: String(organization.org_name || ""),
        org_type: String(organization.org_type || "\u305d\u306e\u4ed6"),
        parent_id: String(organization.parent_id || ""),
        sort_order: Number(organization.sort_order || 0)
      }))
      .sort((left, right) => {
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        return left.org_name.localeCompare(right.org_name, "ja");
      });

    const organizationMap = new Map(organizationsForYear.map((organization) => [organization.id, organization]));
    const memberMap = new Map(memberOptions.map((member) => [member.id, member]));

    const assignmentsForYear = assignments
      .filter((assignment) => String(assignment.fiscal_year_id || "") === selectedFiscalYearId)
      .filter((assignment) => organizationMap.has(String(assignment.organization_id || "")))
      .map((assignment) => ({
        id: assignment.id,
        fiscal_year_id: String(assignment.fiscal_year_id || ""),
        organization_id: String(assignment.organization_id || ""),
        member_id: String(assignment.member_id || ""),
        role: String(assignment.role || ""),
        sort_order: Number(assignment.sort_order || 0)
      }))
      .sort((left, right) => {
        const roleDiff = rolePriority(left.role) - rolePriority(right.role);
        if (roleDiff !== 0) {
          return roleDiff;
        }
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        const leftName = memberMap.get(left.member_id)?.name_kanji || "";
        const rightName = memberMap.get(right.member_id)?.name_kanji || "";
        return leftName.localeCompare(rightName, "ja");
      });

    const organizationsWithAssignments = organizationsForYear.map((organization) => {
      const parent = organization.parent_id ? organizationMap.get(organization.parent_id) : null;
      const orgAssignments = assignmentsForYear
        .filter((assignment) => assignment.organization_id === organization.id)
        .map((assignment) => ({
          ...assignment,
          member_name: memberMap.get(assignment.member_id)?.name_kanji || "",
          member_type: memberMap.get(assignment.member_id)?.member_type || "",
          company_name: memberMap.get(assignment.member_id)?.company_name || ""
        }));

      return {
        ...organization,
        parent_name: parent?.org_name || "",
        assignments: orgAssignments
      };
    });

    return Response.json({
      ok: true,
      current_fiscal_year_id: currentFiscalYear?.id || "",
      fiscal_years: years,
      selected_fiscal_year: selectedFiscalYear,
      member_options: memberOptions,
      organizations: organizationsWithAssignments
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
