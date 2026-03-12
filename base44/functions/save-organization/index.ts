import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_ORG_TYPES = ["幹事会", "委員会", "部会", "室", "その他"];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSortOrder(value: unknown) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = normalizeString(body?.id);
    const payload = {
      fiscal_year_id: normalizeString(body?.fiscal_year_id),
      org_name: normalizeString(body?.org_name),
      org_type: normalizeString(body?.org_type) || "その他",
      parent_id: normalizeString(body?.parent_id),
      sort_order: normalizeSortOrder(body?.sort_order),
      supervisor_id: normalizeString(body?.supervisor_id),
    };

    if (!payload.fiscal_year_id) {
      return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
    }
    if (!payload.org_name) {
      return Response.json({ ok: false, error: "org_name is required" }, { status: 400 });
    }
    if (!ALLOWED_ORG_TYPES.includes(payload.org_type)) {
      return Response.json({ ok: false, error: "org_type is invalid" }, { status: 400 });
    }
    if (id && payload.parent_id && id === payload.parent_id) {
      return Response.json({ ok: false, error: "parent_id must be different from id" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    if (payload.parent_id) {
      const parent = await base44.asServiceRole.entities.Organization.get(payload.parent_id);
      if (!parent) {
        return Response.json({ ok: false, error: "parent organization not found" }, { status: 404 });
      }
      if (String(parent.fiscal_year_id || "") !== payload.fiscal_year_id) {
        return Response.json({ ok: false, error: "parent organization fiscal year mismatch" }, { status: 409 });
      }
    }

    const organization = id
      ? await base44.asServiceRole.entities.Organization.update(id, payload)
      : await base44.asServiceRole.entities.Organization.create(payload);

    return Response.json({ ok: true, organization });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
