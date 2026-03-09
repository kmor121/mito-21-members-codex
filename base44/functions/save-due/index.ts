import { createClientFromRequest } from "npm:@base44/sdk";

const DUE_STATUS_UNPAID = "\u672a\u7d0d";
const DUE_STATUS_PAID = "\u7d0d\u5165\u6e08";
const LEGACY_DUE_STATUS_PAID = "\u5165\u91d1\u6e08";
const ALLOWED_STATUSES = new Set([DUE_STATUS_UNPAID, DUE_STATUS_PAID, LEGACY_DUE_STATUS_PAID]);

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeAmount(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeStatus(value: unknown) {
  const source = normalizeString(value);
  if (source === LEGACY_DUE_STATUS_PAID) {
    return DUE_STATUS_PAID;
  }
  if (source === DUE_STATUS_PAID) {
    return DUE_STATUS_PAID;
  }
  return DUE_STATUS_UNPAID;
}

function isValidDate(value: string) {
  return value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const rawStatus = normalizeString(body?.status);
    const payload = {
      fiscal_year_id: normalizeString(body?.fiscal_year_id),
      member_id: normalizeString(body?.member_id),
      status: normalizeStatus(rawStatus),
      paid_date: normalizeString(body?.paid_date || body?.payment_date),
      notes: normalizeString(body?.notes || body?.note),
      amount: normalizeAmount(body?.amount)
    };

    if (!payload.fiscal_year_id) {
      return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
    }
    if (!payload.member_id) {
      return Response.json({ ok: false, error: "member_id is required" }, { status: 400 });
    }
    if (!ALLOWED_STATUSES.has(rawStatus || DUE_STATUS_UNPAID)) {
      return Response.json({ ok: false, error: "status is invalid" }, { status: 400 });
    }
    if (!isValidDate(payload.paid_date)) {
      return Response.json({ ok: false, error: "paid_date is invalid" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const due = await base44.asServiceRole.entities.Due.create({
      fiscal_year_id: payload.fiscal_year_id,
      member_id: payload.member_id,
      amount: payload.amount,
      status: payload.status,
      paid_date: payload.status === DUE_STATUS_PAID ? payload.paid_date : "",
      notes: payload.notes
    });

    return Response.json({ ok: true, due });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
