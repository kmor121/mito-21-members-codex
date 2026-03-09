import { createClientFromRequest } from "npm:@base44/sdk";

const ROLE_PRIORITY: Record<string, number> = {
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

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function rolePriority(role: unknown) {
  const normalized = String(role || "").trim();
  return ROLE_PRIORITY[normalized] || 999;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
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

    const memberMap = new Map(
      members.map((member) => [
        member.id,
        {
          id: member.id,
          name_kanji: String(member.name_kanji || member.name || ""),
          member_type: String(member.member_type || "")
        }
      ])
    );

    const organizationsForYear = organizations
      .filter((organization) => String(organization.fiscal_year_id || "") === selectedFiscalYearId)
      .map((organization) => ({
        id: organization.id,
        fiscal_year_id: String(organization.fiscal_year_id || ""),
        org_name: String(organization.org_name || ""),
        org_type: String(organization.org_type || ""),
        parent_id: String(organization.parent_id || ""),
        sort_order: Number(organization.sort_order || 0),
        created_date: String(organization.created_date || "")
      }))
      .sort((left, right) => {
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        return left.org_name.localeCompare(right.org_name, "ja");
      });

    const organizationMap = new Map(
      organizationsForYear.map((organization) => [organization.id, organization])
    );

    const assignmentsForYear = assignments
      .filter((assignment) => String(assignment.fiscal_year_id || "") === selectedFiscalYearId)
      .map((assignment) => ({
        id: assignment.id,
        organization_id: String(assignment.organization_id || ""),
        member_id: String(assignment.member_id || ""),
        role: String(assignment.role || ""),
        sort_order: Number(assignment.sort_order || 0),
        created_date: String(assignment.created_date || "")
      }))
      .filter((assignment) => organizationMap.has(assignment.organization_id));

    const cards = organizationsForYear.map((organization) => {
      const orgAssignments = assignmentsForYear
        .filter((assignment) => assignment.organization_id === organization.id)
        .map((assignment) => {
          const member = memberMap.get(assignment.member_id);

          return {
            id: assignment.id,
            role: assignment.role,
            sort_order: assignment.sort_order,
            member: {
              id: assignment.member_id,
              name_kanji: member?.name_kanji || "\u4f1a\u54e1\u672a\u767b\u9332",
              member_type: member?.member_type || ""
            }
          };
        })
        .sort((left, right) => {
          const roleDiff = rolePriority(left.role) - rolePriority(right.role);
          if (roleDiff !== 0) {
            return roleDiff;
          }
          if (left.sort_order !== right.sort_order) {
            return left.sort_order - right.sort_order;
          }
          return left.member.name_kanji.localeCompare(right.member.name_kanji, "ja");
        });

      const parent = organization.parent_id ? organizationMap.get(organization.parent_id) : null;

      return {
        id: organization.id,
        org_name: organization.org_name,
        org_type: organization.org_type,
        parent_name: parent?.org_name || "",
        assignments: orgAssignments
      };
    });

    return Response.json({
      ok: true,
      current_fiscal_year_id: currentFiscalYear?.id || "",
      fiscal_years: years,
      selected_fiscal_year: selectedFiscalYear,
      organizations_count: organizationsForYear.length,
      assignments_count: assignmentsForYear.length,
      organizations: cards
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
