import { createClientFromRequest } from "npm:@base44/sdk";

const ELIGIBLE_TYPES = ["正会員", "賛助会員"];

function getMidpointDate(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
  const mid = new Date((start.getTime() + end.getTime()) / 2);
  return mid.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const fiscalYearId = typeof body?.fiscal_year_id === "string" ? body.fiscal_year_id.trim() : "";

    if (!fiscalYearId) {
      return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Get fiscal year
    const fy = await base44.asServiceRole.entities.FiscalYear.get(fiscalYearId);
    if (!fy) {
      return Response.json({ ok: false, error: "Fiscal year not found" }, { status: 404 });
    }

    // Get due settings
    const dueSettings = await base44.asServiceRole.entities.DueSetting.filter({
      fiscal_year_id: fiscalYearId,
    });
    const settings = dueSettings.length > 0 ? dueSettings[0] : null;
    const regularFee = Number(settings?.regular_annual_fee ?? 30000);
    const associateFee = Number(settings?.associate_annual_fee ?? 10000);
    const admissionFee = Number(settings?.admission_fee ?? 10000);
    const firstHalfFee = Number(settings?.first_half_fee ?? 30000);
    const secondHalfFee = Number(settings?.second_half_fee ?? 15000);

    // Get all approved, eligible members
    const allMembers = await base44.asServiceRole.entities.Member.filter({
      approval_status: "承認済",
    });
    const eligibleMembers = allMembers.filter((m: any) => ELIGIBLE_TYPES.includes(m.member_type));

    // Get existing dues for this FY
    const existingDues = await base44.asServiceRole.entities.Due.filter({
      fiscal_year_id: fiscalYearId,
    });
    const memberIdsWithDues = new Set(existingDues.map((d: any) => d.member_id));

    // Determine front-half or back-half of the year
    const startDate = String(fy.start_date || "");
    const endDate = String(fy.end_date || "");
    const midpoint = getMidpointDate(startDate, endDate);
    const today = new Date().toISOString().slice(0, 10);

    let generatedCount = 0;

    for (const member of eligibleMembers) {
      if (memberIdsWithDues.has(member.id)) continue; // Skip if already has dues

      const memberType = String(member.member_type || "");
      const isNew = member.is_new === true;

      if (isNew) {
        // New member: admission fee + annual/half-year fee
        const joinDate = String(member.join_date || today);
        const isSecondHalf = midpoint && joinDate > midpoint;

        if (admissionFee > 0) {
          await base44.asServiceRole.entities.Due.create({
            fiscal_year_id: fiscalYearId,
            member_id: member.id,
            amount: admissionFee,
            status: "未納",
            due_type: "入会金",
          });
          generatedCount++;
        }

        let annualFeeAmount: number;
        let annualFeeDueType: string;
        if (isSecondHalf) {
          annualFeeAmount = secondHalfFee;
          annualFeeDueType = "後期入会会費";
        } else {
          annualFeeAmount = memberType === "賛助会員" ? associateFee : firstHalfFee;
          annualFeeDueType = "年会費";
        }

        if (annualFeeAmount > 0) {
          await base44.asServiceRole.entities.Due.create({
            fiscal_year_id: fiscalYearId,
            member_id: member.id,
            amount: annualFeeAmount,
            status: "未納",
            due_type: annualFeeDueType,
          });
          generatedCount++;
        }
      } else {
        // Existing member: just annual fee
        const annualFee = memberType === "賛助会員" ? associateFee : regularFee;

        if (annualFee > 0) {
          await base44.asServiceRole.entities.Due.create({
            fiscal_year_id: fiscalYearId,
            member_id: member.id,
            amount: annualFee,
            status: "未納",
            due_type: "年会費",
          });
          generatedCount++;
        }
      }
    }

    const skippedCount = eligibleMembers.length - (eligibleMembers.filter((m: any) => !memberIdsWithDues.has(m.id)).length);

    return Response.json({
      ok: true,
      generated_count: generatedCount,
      eligible_count: eligibleMembers.length,
      skipped_count: skippedCount,
    });
  } catch (error) {
    console.error("bulk-generate-dues error:", error);
    return Response.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
});
