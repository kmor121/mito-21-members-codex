import { createClientFromRequest } from "npm:@base44/sdk";

const MEMBER_TYPE_REGULAR = "\u6b63\u4f1a\u54e1";
const MEMBER_TYPE_SUPPORTING = "\u8cdb\u52a9\u4f1a\u54e1";
const DUE_STATUS_UNPAID = "\u672a\u7d0d";
const DUE_STATUS_PAID = "\u7d0d\u5165\u6e08";
const LEGACY_DUE_STATUS_PAID = "\u5165\u91d1\u6e08";

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
  if (source === LEGACY_DUE_STATUS_PAID) {
    return DUE_STATUS_PAID;
  }
  if (source === DUE_STATUS_PAID) {
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

function recordTimestamp(record: Record<string, unknown>) {
  return String(record.updated_date || record.created_date || "");
}

function hasCanonicalDueFields(record: Record<string, unknown>) {
  return "paid_date" in record || "notes" in record || String(record.status || "") === DUE_STATUS_PAID;
}

function shouldReplaceDue(currentDue: Record<string, unknown>, nextDue: Record<string, unknown>) {
  const currentCanonical = hasCanonicalDueFields(currentDue);
  const nextCanonical = hasCanonicalDueFields(nextDue);

  if (currentCanonical !== nextCanonical) {
    return nextCanonical;
  }

  return recordTimestamp(nextDue) > recordTimestamp(currentDue);
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
          regular_member_amount: 0,
          supporting_member_amount: 0
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

    const [dueSettings, dues] = await Promise.all([
      base44.asServiceRole.entities.DueSetting.filter({ fiscal_year_id: selectedFiscalYearId }),
      base44.asServiceRole.entities.Due.filter({ fiscal_year_id: selectedFiscalYearId })
    ]);

    const settingsForYear = dueSettings.map((setting) => ({
      id: setting.id,
      fiscal_year_id: String(setting.fiscal_year_id || ""),
      member_type: String(setting.member_type || ""),
      amount: toAmount(setting.amount)
    }));
    const settingMap = new Map(settingsForYear.map((setting) => [setting.member_type, setting]));

    const dueMap = new Map<string, Record<string, unknown>>();
    for (const due of dues) {
      const memberId = String(due.member_id || "");
      if (!memberId) {
        continue;
      }
      const currentDue = dueMap.get(memberId);
      if (!currentDue || shouldReplaceDue(currentDue, due)) {
        dueMap.set(memberId, due);
      }
    }

    const memberIds = Array.from(dueMap.keys());
    const memberEntries = await Promise.all(
      memberIds.map(async (memberId) => {
        try {
          const member = await base44.asServiceRole.entities.Member.get(memberId);
          return [memberId, member] as const;
        } catch {
          return [memberId, null] as const;
        }
      })
    );
    const memberMap = new Map(memberEntries);

    const rows = memberIds
      .map((memberId) => {
        const due = dueMap.get(memberId) || {};
        const member = memberMap.get(memberId);
        if (!member) {
          return null;
        }
        const memberType = String(member.member_type || "");
        if (!ELIGIBLE_MEMBER_TYPES.has(memberType)) {
          return null;
        }
        if (String(member.approval_status || "") !== "\u627f\u8a8d\u6e08") {
          return null;
        }
        if (String(member.status || "") !== "\u6d3b\u52d5\u4e2d") {
          return null;
        }

        return {
          id: String(due.id || ""),
          fiscal_year_id: selectedFiscalYearId,
          member_id: memberId,
          member_name: String(member.name_kanji || ""),
          member_type: memberType,
          member_number: String(member.member_number || ""),
          amount: toAmount(due.amount ?? settingMap.get(memberType)?.amount ?? 0),
          status: normalizeDueStatus(due.status),
          paid_date: readPaidDate(due),
          notes: readNotes(due)
        };
      })
      .filter((row) => row !== null)
      .sort((left, right) => {
        if (left.member_type !== right.member_type) {
          return left.member_type.localeCompare(right.member_type, "ja");
        }
        return left.member_name.localeCompare(right.member_name, "ja");
      });

    const summary = rows.reduce(
      (accumulator, row) => {
        accumulator.total_count += 1;
        accumulator.total_amount += row.amount;
        if (row.status === DUE_STATUS_PAID) {
          accumulator.paid_count += 1;
          accumulator.paid_amount += row.amount;
        } else {
          accumulator.unpaid_count += 1;
          accumulator.unpaid_amount += row.amount;
        }
        return accumulator;
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
      due_settings: {
        regular_member_amount: settingMap.get(MEMBER_TYPE_REGULAR)?.amount || 0,
        supporting_member_amount: settingMap.get(MEMBER_TYPE_SUPPORTING)?.amount || 0
      },
      dues: rows,
      summary
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
