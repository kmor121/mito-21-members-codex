import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
}

function normalizeYear(value: unknown) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) ? numericValue : 0;
}

function isValidDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function clearOtherCurrentFlags(base44: ReturnType<typeof createClientFromRequest>, currentId: string) {
  const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();

  for (const fiscalYear of fiscalYears) {
    if (fiscalYear.id !== currentId && fiscalYear.is_current === true) {
      await base44.asServiceRole.entities.FiscalYear.update(fiscalYear.id, {
        is_current: false
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = normalizeString(body?.id);
    const payload = {
      year: normalizeYear(body?.year),
      start_date: normalizeString(body?.start_date),
      end_date: normalizeString(body?.end_date),
      is_current: normalizeBoolean(body?.is_current)
    };

    if (!payload.year || payload.year < 2000) {
      return Response.json({ ok: false, error: "year is invalid" }, { status: 400 });
    }
    if (!isValidDate(payload.start_date)) {
      return Response.json({ ok: false, error: "start_date is invalid" }, { status: 400 });
    }
    if (!isValidDate(payload.end_date)) {
      return Response.json({ ok: false, error: "end_date is invalid" }, { status: 400 });
    }
    if (payload.start_date > payload.end_date) {
      return Response.json({ ok: false, error: "start_date must be before end_date" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const duplicateYears = await base44.asServiceRole.entities.FiscalYear.filter({
      year: payload.year
    });
    const hasDuplicateYear = duplicateYears.some((fiscalYear) => fiscalYear.id !== id);

    if (hasDuplicateYear) {
      return Response.json({ ok: false, error: "year already exists" }, { status: 409 });
    }

    const existingFiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
    const hasOtherCurrent = existingFiscalYears.some(
      (fiscalYear) => fiscalYear.id !== id && fiscalYear.is_current === true
    );
    const normalizedPayload = {
      ...payload,
      is_current: payload.is_current || !hasOtherCurrent
    };

    const fiscalYear = id
      ? await base44.asServiceRole.entities.FiscalYear.update(id, normalizedPayload)
      : await base44.asServiceRole.entities.FiscalYear.create(normalizedPayload);

    if (normalizedPayload.is_current) {
      await clearOtherCurrentFlags(base44, fiscalYear.id);
    }

    return Response.json({ ok: true, fiscal_year: fiscalYear });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
