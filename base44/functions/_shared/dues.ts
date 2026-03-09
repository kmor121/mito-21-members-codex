const MEMBER_TYPE_REGULAR = "\u6b63\u4f1a\u54e1";
const MEMBER_TYPE_SUPPORTING = "\u8cdb\u52a9\u4f1a\u54e1";
const APPROVAL_APPROVED = "\u627f\u8a8d\u6e08";
const MEMBER_STATUS_ACTIVE = "\u6d3b\u52d5\u4e2d";
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

export async function getCanonicalDuesForFiscalYear(base44: any, fiscalYearId: string) {
  const [dueSettings, dues] = await Promise.all([
    base44.asServiceRole.entities.DueSetting.filter({ fiscal_year_id: fiscalYearId }),
    base44.asServiceRole.entities.Due.filter({ fiscal_year_id: fiscalYearId })
  ]);

  const settingsForYear = dueSettings.map((setting: any) => ({
    id: setting.id,
    fiscal_year_id: String(setting.fiscal_year_id || ""),
    member_type: String(setting.member_type || ""),
    amount: toAmount(setting.amount)
  }));
  const settingMap = new Map(settingsForYear.map((setting: any) => [setting.member_type, setting]));

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
      if (String(member.approval_status || "") !== APPROVAL_APPROVED) {
        return null;
      }
      if (String(member.status || "") !== MEMBER_STATUS_ACTIVE) {
        return null;
      }

      return {
        id: String(due.id || ""),
        fiscal_year_id: fiscalYearId,
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
    .sort((left: any, right: any) => {
      if (left.member_type !== right.member_type) {
        return left.member_type.localeCompare(right.member_type, "ja");
      }
      return left.member_name.localeCompare(right.member_name, "ja");
    });

  const summary = rows.reduce(
    (accumulator: any, row: any) => {
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

  return {
    due_settings: {
      regular_member_amount: settingMap.get(MEMBER_TYPE_REGULAR)?.amount || 0,
      supporting_member_amount: settingMap.get(MEMBER_TYPE_SUPPORTING)?.amount || 0
    },
    dues: rows,
    summary
  };
}
