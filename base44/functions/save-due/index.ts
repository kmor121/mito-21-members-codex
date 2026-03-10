import { createClientFromRequest } from "npm:@base44/sdk";

const DUE_STATUS_UNPAID = "未納";
const DUE_STATUS_PAID = "納入済";
const LEGACY_DUE_STATUS_PAID = "入金済";
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
    const id = normalizeString(body?.id);
    const rawStatus = normalizeString(body?.status);
    const status = normalizeStatus(rawStatus);
    const paid_date = normalizeString(body?.paid_date || body?.payment_date);
    const notes = normalizeString(body?.notes || body?.note);
    const payer_name = normalizeString(body?.payer_name);
    const amount = normalizeAmount(body?.amount);

    if (!isValidDate(paid_date)) {
      return Response.json({ ok: false, error: "paid_date is invalid" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    if (id) {
      // Update existing due
      const updateData: Record<string, unknown> = {
        status,
        paid_date: status === DUE_STATUS_PAID ? paid_date : "",
        payer_name: status === DUE_STATUS_PAID ? payer_name : "",
        notes,
      };
      if (amount > 0) {
        updateData.amount = amount;
      }

      const due = await base44.asServiceRole.entities.Due.update(id, updateData);
      return Response.json({ ok: true, due });
    } else {
      // Create new due
      const fiscal_year_id = normalizeString(body?.fiscal_year_id);
      const member_id = normalizeString(body?.member_id);

      if (!fiscal_year_id) {
        return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
      }
      if (!member_id) {
        return Response.json({ ok: false, error: "member_id is required" }, { status: 400 });
      }

      const due = await base44.asServiceRole.entities.Due.create({
        fiscal_year_id,
        member_id,
        amount,
        status,
        paid_date: status === DUE_STATUS_PAID ? paid_date : "",
        payer_name: status === DUE_STATUS_PAID ? payer_name : "",
        notes,
      });
      return Response.json({ ok: true, due });
    }
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: error.message || "Internal server error" }, { status: 500 });
  }
});
