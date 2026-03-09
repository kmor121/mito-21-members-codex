import { createClientFromRequest } from "npm:@base44/sdk";

const MEMBER_TYPE_REGULAR = "\u6b63\u4f1a\u54e1";
const MEMBER_TYPE_SUPPORTING = "\u8cdb\u52a9\u4f1a\u54e1";
const APPROVAL_APPROVED = "\u627f\u8a8d\u6e08";
const MEMBER_STATUS_ACTIVE = "\u6d3b\u52d5\u4e2d";
const DUE_STATUS_UNPAID = "\u672a\u7d0d";

const ALLOWED_MEMBER_TYPES = new Set([MEMBER_TYPE_REGULAR, MEMBER_TYPE_SUPPORTING]);

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAmount(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const fiscalYearId = normalizeString(body?.fiscal_year_id);
    const settings = Array.isArray(body?.settings) ? body.settings : [];

    if (!fiscalYearId) {
      return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
    }
    if (!settings.length) {
      return Response.json({ ok: false, error: "settings are required" }, { status: 400 });
    }

    const normalizedSettings = settings
      .map((setting) => ({
        member_type: normalizeString(setting?.member_type),
        amount: normalizeAmount(setting?.amount)
      }))
      .filter((setting) => ALLOWED_MEMBER_TYPES.has(setting.member_type));

    if (!normalizedSettings.length) {
      return Response.json({ ok: false, error: "settings are invalid" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const [existingSettings, dues, members] = await Promise.all([
      base44.asServiceRole.entities.DueSetting.filter({ fiscal_year_id: fiscalYearId }),
      base44.asServiceRole.entities.Due.filter({ fiscal_year_id: fiscalYearId }),
      base44.asServiceRole.entities.Member.filter({
        approval_status: APPROVAL_APPROVED,
        status: MEMBER_STATUS_ACTIVE
      })
    ]);

    const savedSettings = [];
    for (const setting of normalizedSettings) {
      const existing = existingSettings.find(
        (item) =>
          String(item.fiscal_year_id || "") === fiscalYearId &&
          String(item.member_type || "") === setting.member_type
      );

      const saved = existing
        ? await base44.asServiceRole.entities.DueSetting.update(existing.id, {
            amount: setting.amount
          })
        : await base44.asServiceRole.entities.DueSetting.create({
            fiscal_year_id: fiscalYearId,
            member_type: setting.member_type,
            amount: setting.amount
          });

      savedSettings.push(saved);
    }

    const eligibleMembers = members.filter((member) => ALLOWED_MEMBER_TYPES.has(String(member.member_type || "")));
    const dueMemberIds = new Set(dues.map((due) => String(due.member_id || "")).filter(Boolean));

    for (const member of eligibleMembers) {
      if (dueMemberIds.has(member.id)) {
        continue;
      }
      const memberType = String(member.member_type || "");
      const amount = normalizedSettings.find((setting) => setting.member_type === memberType)?.amount;
      if (amount === undefined) {
        continue;
      }
      const createdDue = await base44.asServiceRole.entities.Due.create({
        fiscal_year_id: fiscalYearId,
        member_id: member.id,
        amount,
        status: DUE_STATUS_UNPAID,
        paid_date: "",
        notes: ""
      });
      dueMemberIds.add(String(createdDue.member_id || ""));
    }

    for (const due of dues) {
      const member = eligibleMembers.find((item) => item.id === String(due.member_id || ""));
      if (!member) {
        continue;
      }
      const memberType = String(member.member_type || "");
      const amount = normalizedSettings.find((setting) => setting.member_type === memberType)?.amount;
      if (amount === undefined) {
        continue;
      }
      await base44.asServiceRole.entities.Due.update(due.id, { amount });
    }

    return Response.json({ ok: true, settings: savedSettings });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
