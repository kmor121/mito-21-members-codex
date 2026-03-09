import { createClientFromRequest } from "npm:@base44/sdk";

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
      organization_id: normalizeString(body?.organization_id),
      member_id: normalizeString(body?.member_id),
      role: normalizeString(body?.role),
      sort_order: normalizeSortOrder(body?.sort_order)
    };

    if (!payload.fiscal_year_id) {
      return Response.json({ ok: false, error: "fiscal_year_id is required" }, { status: 400 });
    }
    if (!payload.organization_id) {
      return Response.json({ ok: false, error: "organization_id is required" }, { status: 400 });
    }
    if (!payload.member_id) {
      return Response.json({ ok: false, error: "member_id is required" }, { status: 400 });
    }
    if (!payload.role) {
      return Response.json({ ok: false, error: "role is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const [organization, member] = await Promise.all([
      base44.asServiceRole.entities.Organization.get(payload.organization_id),
      base44.asServiceRole.entities.Member.get(payload.member_id)
    ]);

    if (!organization) {
      return Response.json({ ok: false, error: "organization not found" }, { status: 404 });
    }
    if (!member) {
      return Response.json({ ok: false, error: "member not found" }, { status: 404 });
    }
    if (String(organization.fiscal_year_id || "") !== payload.fiscal_year_id) {
      return Response.json({ ok: false, error: "organization fiscal year mismatch" }, { status: 409 });
    }

    const assignment = id
      ? await base44.asServiceRole.entities.OrgAssignment.update(id, payload)
      : await base44.asServiceRole.entities.OrgAssignment.create(payload);

    return Response.json({ ok: true, assignment });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
