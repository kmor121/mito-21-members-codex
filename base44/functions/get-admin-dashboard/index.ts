import { createClientFromRequest } from "npm:@base44/sdk";

const APPROVAL_PENDING = "\u7533\u8acb\u4e2d";
const APPROVAL_APPROVED = "\u627f\u8a8d\u6e08";
const STATUS_ACTIVE = "\u6d3b\u52d5\u4e2d";
const STATUS_PAUSED = "\u4f11\u4f1a";
const MEMBER_TYPE_REGULAR = "\u6b63\u4f1a\u54e1";
const MEMBER_TYPE_SUPPORTING = "\u8cdb\u52a9\u4f1a\u54e1";
const MEMBER_TYPE_OB = "OB\u4f1a\u54e1";
const DUE_STATUS_UNPAID = "\u672a\u7d0d";
const DUE_STATUS_PAID = "\u7d0d\u5165\u6e08";
const LEGACY_DUE_STATUS_PAID = "\u5165\u91d1\u6e08";
const ELIGIBLE_MEMBER_TYPES = new Set([MEMBER_TYPE_REGULAR, MEMBER_TYPE_SUPPORTING]);

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

    const [fiscalYears, pendingMembers, approvedMembers, newsletters] = await Promise.all([
      base44.asServiceRole.entities.FiscalYear.list(),
      base44.asServiceRole.entities.Member.filter({ approval_status: APPROVAL_PENDING }),
      base44.asServiceRole.entities.Member.filter({ approval_status: APPROVAL_APPROVED }),
      base44.asServiceRole.entities.Newsletter.list()
    ]);

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

    const currentFiscalYear = fiscalYearList.find((fiscalYear) => fiscalYear.is_current) || fiscalYearList[0] || null;

    let dueSummary = {
      total_count: 0,
      paid_count: 0,
      unpaid_count: 0,
      total_amount: 0,
      paid_amount: 0,
      unpaid_amount: 0
    };

    if (currentFiscalYear) {
      const [dueSettings, dues] = await Promise.all([
        base44.asServiceRole.entities.DueSetting.filter({ fiscal_year_id: currentFiscalYear.id }),
        base44.asServiceRole.entities.Due.filter({ fiscal_year_id: currentFiscalYear.id })
      ]);

      const settingsForYear = dueSettings.map((setting) => ({
        member_type: String(setting.member_type || ""),
        amount: toAmount(setting.amount)
      }));
      const settingMap = new Map(settingsForYear.map((setting) => [setting.member_type, setting]));

      const dueMap = new Map();
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

      const rows = approvedMembers
        .map((member) => {
          const memberType = String(member.member_type || "");
          if (!ELIGIBLE_MEMBER_TYPES.has(memberType)) {
            return null;
          }
          if (String(member.status || "") !== STATUS_ACTIVE) {
            return null;
          }

          const due = dueMap.get(member.id) || {};
          return {
            amount: toAmount(due.amount ?? settingMap.get(memberType)?.amount ?? 0),
            status: normalizeDueStatus(due.status),
            paid_date: readPaidDate(due),
            notes: readNotes(due)
          };
        })
        .filter((row) => row !== null);

      dueSummary = rows.reduce(
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
        dueSummary
      );
    }

    const memberSummary = {
      regular_count: approvedMembers.filter((member) => String(member.member_type || "") === MEMBER_TYPE_REGULAR && String(member.status || "") === STATUS_ACTIVE).length,
      supporting_count: approvedMembers.filter((member) => String(member.member_type || "") === MEMBER_TYPE_SUPPORTING && String(member.status || "") === STATUS_ACTIVE).length,
      ob_count: approvedMembers.filter((member) => String(member.member_type || "") === MEMBER_TYPE_OB && String(member.status || "") === STATUS_ACTIVE).length,
      paused_count: approvedMembers.filter((member) => String(member.status || "") === STATUS_PAUSED).length,
      new_count: approvedMembers.filter((member) => member.is_new === true && String(member.status || "") === STATUS_ACTIVE).length
    };

    const recentNewsletters = newsletters
      .map((newsletter) => ({
        id: newsletter.id,
        title: String(newsletter.title || ""),
        channel: String(newsletter.channel || ""),
        status: String(newsletter.status || ""),
        updated_at: String(newsletter.updated_date || newsletter.created_date || "")
      }))
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at))
      .slice(0, 5);

    return Response.json({
      ok: true,
      current_fiscal_year: currentFiscalYear,
      pending_application_count: pendingMembers.length,
      member_summary: memberSummary,
      due_summary: dueSummary,
      recent_newsletters: recentNewsletters
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
