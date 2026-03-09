import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const base44 = createClientFromRequest(req);
    const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();

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

    return Response.json({
      ok: true,
      current_fiscal_year_id: currentFiscalYear?.id || "",
      years
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
