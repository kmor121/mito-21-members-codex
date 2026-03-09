import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = normalizeString(body?.id);

    if (!id) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const organization = await base44.asServiceRole.entities.Organization.get(id);

    if (!organization) {
      return Response.json({ ok: false, error: "Organization not found" }, { status: 404 });
    }

    const [assignments, organizations] = await Promise.all([
      base44.asServiceRole.entities.OrgAssignment.filter({ organization_id: id }),
      base44.asServiceRole.entities.Organization.filter({ parent_id: id })
    ]);

    if (assignments.length > 0) {
      return Response.json({ ok: false, error: "organization has assignments" }, { status: 409 });
    }
    if (organizations.length > 0) {
      return Response.json({ ok: false, error: "organization has child organizations" }, { status: 409 });
    }

    await base44.asServiceRole.entities.Organization.delete(id);
    return Response.json({ ok: true, id });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
