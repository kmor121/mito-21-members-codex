import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    if (!q) {
      return Response.json({ results: [] });
    }

    const base44 = createClientFromRequest(req);

    // Get all dues with payer_name across all fiscal years
    const allDues = await base44.asServiceRole.entities.Due.list();
    const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();

    const fyMap: Record<string, string> = {};
    for (const fy of fiscalYears) {
      fyMap[fy.id] = fy.year ? `${fy.year}年度` : fy.id;
    }

    // Filter dues that have a matching payer_name
    const results = allDues
      .filter((d: any) => {
        const pn = (d.payer_name || "").toLowerCase();
        const mn = (d.member_name || "").toLowerCase();
        return pn.includes(q) || mn.includes(q);
      })
      .map((d: any) => ({
        member_name: d.member_name || "",
        payer_name: d.payer_name || "",
        year: fyMap[d.fiscal_year_id] || "",
        amount: d.amount || 0,
        status: d.status || "",
        fiscal_year_id: d.fiscal_year_id || "",
      }))
      .slice(0, 50);

    return Response.json({ results });
  } catch (error) {
    console.error(error);
    return Response.json({ results: [], error: error.message || "Internal server error" }, { status: 500 });
  }
});
