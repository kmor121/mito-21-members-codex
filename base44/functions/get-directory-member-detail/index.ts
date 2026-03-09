import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const id = normalize(url.searchParams.get("id"));

    if (!id) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(id);

    if (!member || member.approval_status !== "承認済" || member.status !== "活動中") {
      return Response.json({ ok: false, error: "Directory member not found" }, { status: 404 });
    }

    // Fetch org assignments for current fiscal year
    const [fiscalYears, assignments, organizations] = await Promise.all([
      base44.asServiceRole.entities.FiscalYear.list(),
      base44.asServiceRole.entities.OrgAssignment.filter({ member_id: id }),
      base44.asServiceRole.entities.Organization.list()
    ]);

    const currentFy = fiscalYears.find((fy) => fy.is_current === true);
    const currentFyId = currentFy?.id || "";

    const orgMap = new Map<string, string>();
    for (const org of organizations) {
      orgMap.set(org.id, String(org.org_name || ""));
    }

    const currentAssignments = assignments
      .filter((a) => String(a.fiscal_year_id || "") === currentFyId)
      .map((a) => ({
        org_name: orgMap.get(String(a.organization_id || "")) || "",
        role: String(a.role || "")
      }));

    return Response.json({
      ok: true,
      member: {
        id: member.id,
        name_kanji: member.name_kanji || "",
        member_type: member.member_type || "",
        profile_image: member.profile_image || "",
        birthday: member.birthday || "",
        join_date: member.join_date || "",
        company_name: member.show_company_in_directory ? member.company_name || "" : "",
        company_position: member.show_company_in_directory ? member.company_position || "" : "",
        company_postal_code: member.show_company_in_directory ? member.company_postal_code || "" : "",
        company_address: member.show_company_in_directory ? member.company_address || "" : "",
        company_phone: member.show_company_in_directory ? member.company_phone || "" : "",
        company_fax: member.show_company_in_directory ? member.company_fax || "" : "",
        industry: member.show_company_in_directory ? member.industry || "" : "",
        email: member.show_email_in_directory ? member.email || "" : "",
        mobile_phone: member.show_mobile_in_directory ? member.mobile_phone || "" : "",
        org_assignments: currentAssignments
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
