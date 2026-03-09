import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { fiscal_year_id, status, paid_date } = await req.json();

    if (!fiscal_year_id) {
      return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
    }
    if (!status) {
      return Response.json({ ok: false, error: "status is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const dues = await base44.asServiceRole.entities.Due.filter({ fiscal_year_id });

    const unpaidDues = dues.filter((d) => d.status !== "納入済");
    let updatedCount = 0;

    for (const due of unpaidDues) {
      const updateData: Record<string, unknown> = { status };
      if (paid_date) {
        updateData.paid_date = paid_date;
      }
      await base44.asServiceRole.entities.Due.update(due.id, updateData);
      updatedCount++;
    }

    return Response.json({
      ok: true,
      updated_count: updatedCount,
      total_count: dues.length
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
