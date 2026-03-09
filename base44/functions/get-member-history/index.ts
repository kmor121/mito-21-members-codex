import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const memberId = (url.searchParams.get("memberId") || "").trim();

    if (!memberId) {
      return Response.json({ ok: false, error: "memberId is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const [fiscalYears, allAssignments, allOrganizations, allDues] = await Promise.all([
      base44.asServiceRole.entities.FiscalYear.list(),
      base44.asServiceRole.entities.OrgAssignment.filter({ member_id: memberId }),
      base44.asServiceRole.entities.Organization.list(),
      base44.asServiceRole.entities.Due.filter({ member_id: memberId })
    ]);

    const yearMap = new Map<string, { id: string; year: number; is_current: boolean }>();
    for (const fy of fiscalYears) {
      yearMap.set(fy.id, {
        id: fy.id,
        year: Number(fy.year || 0),
        is_current: fy.is_current === true
      });
    }

    const orgMap = new Map<string, string>();
    for (const org of allOrganizations) {
      orgMap.set(org.id, String(org.org_name || ""));
    }

    // Organization history grouped by fiscal year
    const orgHistory: Array<{
      fiscal_year_id: string;
      year: number;
      is_current: boolean;
      assignments: Array<{ org_name: string; role: string }>;
    }> = [];

    const orgByYear = new Map<string, Array<{ org_name: string; role: string }>>();
    for (const assignment of allAssignments) {
      const fyId = String(assignment.fiscal_year_id || "");
      if (!orgByYear.has(fyId)) orgByYear.set(fyId, []);
      orgByYear.get(fyId)!.push({
        org_name: orgMap.get(String(assignment.organization_id || "")) || "不明",
        role: String(assignment.role || "")
      });
    }

    for (const [fyId, assignments] of orgByYear) {
      const fy = yearMap.get(fyId);
      orgHistory.push({
        fiscal_year_id: fyId,
        year: fy?.year || 0,
        is_current: fy?.is_current || false,
        assignments
      });
    }
    orgHistory.sort((a, b) => b.year - a.year);

    // Dues history grouped by fiscal year
    const duesHistory: Array<{
      fiscal_year_id: string;
      year: number;
      amount: number;
      status: string;
      paid_date: string;
      notes: string;
    }> = [];

    for (const due of allDues) {
      const fyId = String(due.fiscal_year_id || "");
      const fy = yearMap.get(fyId);
      duesHistory.push({
        fiscal_year_id: fyId,
        year: fy?.year || 0,
        amount: Number(due.amount || 0),
        status: String(due.status || "未納"),
        paid_date: String(due.paid_date || ""),
        notes: String(due.notes || "")
      });
    }
    duesHistory.sort((a, b) => b.year - a.year);

    return Response.json({
      ok: true,
      org_history: orgHistory,
      dues_history: duesHistory
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
