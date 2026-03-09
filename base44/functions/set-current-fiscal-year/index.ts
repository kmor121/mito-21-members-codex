import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = normalizeString(body?.id);

    if (!id) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
    const target = fiscalYears.find((fiscalYear) => fiscalYear.id === id);

    if (!target) {
      return Response.json({ ok: false, error: "FiscalYear not found" }, { status: 404 });
    }

    for (const fiscalYear of fiscalYears) {
      const nextValue = fiscalYear.id === id;
      if (fiscalYear.is_current !== nextValue) {
        await base44.asServiceRole.entities.FiscalYear.update(fiscalYear.id, {
          is_current: nextValue
        });
      }
    }

    return Response.json({ ok: true, id });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
