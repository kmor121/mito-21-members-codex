const MEMBER_TYPE_REGULAR = "正会員";
const MEMBER_TYPE_SUPPORTING = "賛助会員";
const APPROVAL_APPROVED = "承認済";
const MEMBER_STATUS_ACTIVE = "活動中";
const DUE_STATUS_UNPAID = "未納";
const DUE_STATUS_PAID = "納入済";
const LEGACY_DUE_STATUS_PAID = "入金済";

const ELIGIBLE_MEMBER_TYPES = new Set([MEMBER_TYPE_REGULAR, MEMBER_TYPE_SUPPORTING]);

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

export async function getCanonicalDuesForFiscalYear(base44: any, fiscalYearId: string) {
  const [dueSettings, dues, allMembers] = await Promise.all([
    base44.asServiceRole.entities.DueSetting.filter({ fiscal_year_id: fiscalYearId }),
    base44.asServiceRole.entities.Due.filter({ fiscal_year_id: fiscalYearId }),
    base44.asServiceRole.entities.Member.filter({
      approval_status: APPROVAL_APPROVED,
      status: MEMBER_STATUS_ACTIVE
    })
  ]);

  // Read DueSetting - new schema: single record with named fields
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
      dueSetting = {
        regular_annual_fee: toAmount(first.regular_annual_fee),
        associate_annual_fee: toAmount(first.associate_annual_fee),
        admission_fee: toAmount(first.admission_fee),
        first_half_fee: toAmount(first.first_half_fee),
        second_half_fee: toAmount(first.second_half_fee)
      };
    } else {
      // Old schema backward compat
      for (const s of dueSettings) {
        const mt = String(s.member_type || "");
        const amt = toAmount(s.amount);
        if (mt === MEMBER_TYPE_REGULAR) dueSetting.regular_annual_fee = amt;
        if (mt === MEMBER_TYPE_SUPPORTING) dueSetting.associate_annual_fee = amt;
      }
    }
  }

  // Build member map
  const memberMap = new Map<string, any>();
  for (const member of allMembers) {
    const memberType = String(member.member_type || "");
    if (ELIGIBLE_MEMBER_TYPES.has(memberType)) {
      memberMap.set(member.id, member);
    }
  }

  // Build rows from dues - no deduplication
  const rows = dues
    .map((due: any) => {
      const memberId = String(due.member_id || "");
      if (!memberId) return null;
      const member = memberMap.get(memberId);
      if (!member) return null;

      const memberType = String(member.member_type || "");
      const dueType = String(due.due_type || "年会費");
      const isNew = member.is_new === true;

      return {
        id: String(due.id || ""),
        fiscal_year_id: fiscalYearId,
        member_id: memberId,
        member_name: `${member.last_name || ""} ${member.first_name || ""}`.trim(),
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
    .filter((row: any) => row !== null)
    .sort((left: any, right: any) => {
      if (left.member_name !== right.member_name) {
        return left.member_name.localeCompare(right.member_name, "ja");
      }
      const typeOrder: Record<string, number> = { "入会金": 0, "年会費": 1, "後期入会会費": 2 };
      return (typeOrder[left.due_type] ?? 1) - (typeOrder[right.due_type] ?? 1);
    });

  const summary = rows.reduce(
    (acc: any, row: any) => {
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

  return {
    due_settings: dueSetting,
    dues: rows,
    summary
  };
}
