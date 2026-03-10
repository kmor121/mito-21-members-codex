import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAmount(value: unknown, fallback: number) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const fiscalYearId = normalizeString(body?.fiscal_year_id);

    if (!fiscalYearId) {
      return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
    }

    const regular_annual_fee = normalizeAmount(body?.regular_annual_fee, 30000);
    const associate_annual_fee = normalizeAmount(body?.associate_annual_fee, 10000);
    const admission_fee = normalizeAmount(body?.admission_fee, 10000);
    const first_half_fee = normalizeAmount(body?.first_half_fee, 30000);
    const second_half_fee = normalizeAmount(body?.second_half_fee, 15000);

    const base44 = createClientFromRequest(req);

    // Find existing DueSetting for this fiscal year
    const existingSettings = await base44.asServiceRole.entities.DueSetting.filter({
      fiscal_year_id: fiscalYearId
    });

    const settingData = {
      fiscal_year_id: fiscalYearId,
      regular_annual_fee,
      associate_annual_fee,
      admission_fee,
      first_half_fee,
      second_half_fee
    };

    let saved;
    if (existingSettings.length > 0) {
      // Update first record, delete any extras (cleanup from old schema)
      saved = await base44.asServiceRole.entities.DueSetting.update(existingSettings[0].id, settingData);
      for (let i = 1; i < existingSettings.length; i++) {
        try {
          await base44.asServiceRole.entities.DueSetting.delete(existingSettings[i].id);
        } catch {
          // ignore cleanup errors
        }
      }
    } else {
      saved = await base44.asServiceRole.entities.DueSetting.create(settingData);
    }

    return Response.json({ ok: true, setting: saved });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
