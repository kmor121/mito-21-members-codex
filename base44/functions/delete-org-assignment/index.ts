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
    const assignment = await base44.asServiceRole.entities.OrgAssignment.get(id);

    if (!assignment) {
      return Response.json({ ok: false, error: "OrgAssignment not found" }, { status: 404 });
    }

    await base44.asServiceRole.entities.OrgAssignment.delete(id);
    return Response.json({ ok: true, id });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
