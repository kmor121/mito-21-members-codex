import { createClientFromRequest } from "npm:@base44/sdk";

const MEMBER_TYPE_REGULAR = "正会員";
const MEMBER_TYPE_SUPPORTING = "賛助会員";
const DUE_STATUS_UNPAID = "未納";
const DUE_STATUS_PAID = "納入済";
const LEGACY_DUE_STATUS_PAID = "入金済";

const ELIGIBLE_MEMBER_TYPES = new Set([MEMBER_TYPE_REGULAR, MEMBER_TYPE_SUPPORTING]);

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toAmount(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeDueStatus(value: unknown) {
  const source = String(value || "").trim();
  if (source === LEGACY_DUE_STATUS_PAID || source === DUE_STATUS_PAID) {
    return DUE_STATUS_PAID;
  }
  return DUE_STATUS_UNPAID;
}

function readPaidDate(due: Record<string, unknown>) {
  return String(due.paid_date || due.payment_date || "");
}

function readNotes(due: Record<string, unknown>) {
  return String(due.notes || due.note || "");
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const requestedFiscalYearId = normalize(url.searchParams.get("fiscalYearId"));

    const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
    const fiscalYearList = fiscalYears
      .map((fiscalYear) => ({
        id: fiscalYear.id,
        year: Number(fiscalYear.year || 0),
        start_date: String(fiscalYear.start_date || ""),
        end_date: String(fiscalYear.end_date || ""),
        is_current: fiscalYear.is_current === true
      }))
      .filter((fiscalYear) => fiscalYear.year > 0)
      .sort((left, right) => right.year - left.year);

    const currentFiscalYear =
      fiscalYearList.find((fiscalYear) => fiscalYear.is_current) || fiscalYearList[0] || null;
    const selectedFiscalYear =
      fiscalYearList.find((fiscalYear) => fiscalYear.id === requestedFiscalYearId) || currentFiscalYear;
    const selectedFiscalYearId = selectedFiscalYear?.id || "";

    if (!selectedFiscalYearId) {
      return Response.json({
        ok: true,
        current_fiscal_year_id: "",
        fiscal_years: fiscalYearList,
        selected_fiscal_year: null,
        due_settings: {
          regular_annual_fee: 0,
          associate_annual_fee: 0,
          admission_fee: 0,
          first_half_fee: 0,
          second_half_fee: 0
        },
        dues: [],
        summary: {
          total_count: 0,
          paid_count: 0,
          unpaid_count: 0,
          total_amount: 0,
          paid_amount: 0,
          unpaid_amount: 0
        }
      });
    }

    const [dueSettings, dues, allMembers] = await Promise.all([
      base44.asServiceRole.entities.DueSetting.filter({ fiscal_year_id: selectedFiscalYearId }),
      base44.asServiceRole.entities.Due.filter({ fiscal_year_id: selectedFiscalYearId }),
      base44.asServiceRole.entities.Member.filter({
        approval_status: "承認済",
        status: "活動中"
      })
    ]);

    // Read DueSetting - new schema: single record with named fields
    // Backward compat: if old schema (member_type field), convert
    let dueSetting = {
      regular_annual_fee: 0,
      associate_annual_fee: 0,
      admission_fee: 0,
      first_half_fee: 0,
      second_half_fee: 0
    };

    if (dueSettings.length > 0) {
      const first = dueSettings[0];
      if ("regular_annual_fee" in first) {
        // New schema
        dueSetting = {
          regular_annual_fee: toAmount(first.regular_annual_fee),
          associate_annual_fee: toAmount(first.associate_annual_fee),
          admission_fee: toAmount(first.admission_fee),
          first_half_fee: toAmount(first.first_half_fee),
          second_half_fee: toAmount(first.second_half_fee)
        };
      } else {
        // Old schema: array with member_type + amount
        for (const s of dueSettings) {
          const mt = String(s.member_type || "");
          const amt = toAmount(s.amount);
          if (mt === MEMBER_TYPE_REGULAR) dueSetting.regular_annual_fee = amt;
          if (mt === MEMBER_TYPE_SUPPORTING) dueSetting.associate_annual_fee = amt;
        }
      }
    }

    // Build member map for eligible members
    const memberMap = new Map<string, any>();
    for (const member of allMembers) {
      const memberType = String(member.member_type || "");
      if (ELIGIBLE_MEMBER_TYPES.has(memberType)) {
        memberMap.set(member.id, member);
      }
    }

    // Build rows from dues - NO deduplication (new members can have multiple records)
    const rows = dues
      .map((due) => {
        const memberId = String(due.member_id || "");
        if (!memberId) return null;
        const member = memberMap.get(memberId);
        if (!member) return null;

        const memberType = String(member.member_type || "");
        const dueType = String(due.due_type || "年会費");
        const isNew = member.is_new === true;

        return {
          id: String(due.id || ""),
          fiscal_year_id: selectedFiscalYearId,
          member_id: memberId,
          member_name: String(member.name_kanji || ""),
          member_type: memberType,
          member_number: String(member.member_number || ""),
          due_type: dueType,
          is_new: isNew,
          amount: toAmount(due.amount),
          status: normalizeDueStatus(due.status),
          paid_date: readPaidDate(due),
          notes: readNotes(due)
        };
      })
      .filter((row) => row !== null)
      .sort((left, right) => {
        if (left.member_name !== right.member_name) {
          return left.member_name.localeCompare(right.member_name, "ja");
        }
        // Within same member, show 入会金 before 年会費
        const typeOrder = { "入会金": 0, "年会費": 1, "後期入会会費": 2 };
        return (typeOrder[left.due_type as keyof typeof typeOrder] ?? 1) -
               (typeOrder[right.due_type as keyof typeof typeOrder] ?? 1);
      });

    const summary = rows.reduce(
      (acc, row) => {
        acc.total_count += 1;
        acc.total_amount += row.amount;
        if (row.status === DUE_STATUS_PAID) {
          acc.paid_count += 1;
          acc.paid_amount += row.amount;
        } else {
          acc.unpaid_count += 1;
          acc.unpaid_amount += row.amount;
        }
        return acc;
      },
      {
        total_count: 0,
        paid_count: 0,
        unpaid_count: 0,
        total_amount: 0,
        paid_amount: 0,
        unpaid_amount: 0
      }
    );

    return Response.json({
      ok: true,
      current_fiscal_year_id: currentFiscalYear?.id || "",
      fiscal_years: fiscalYearList,
      selected_fiscal_year: selectedFiscalYear,
      due_settings: dueSetting,
      dues: rows,
      summary
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
