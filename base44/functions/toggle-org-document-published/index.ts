import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
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
    const document = await base44.asServiceRole.entities.OrgDocument.get(id);

    if (!document) {
      return Response.json({ ok: false, error: "OrgDocument not found" }, { status: 404 });
    }

    const nextPublished =
      body?.published === undefined
        ? document.published !== true
        : normalizeBoolean(body?.published);

    const updatedDocument = await base44.asServiceRole.entities.OrgDocument.update(id, {
      published: nextPublished,
      updated_at: new Date().toISOString()
    });

    return Response.json({
      ok: true,
      document: {
        id: updatedDocument.id,
        published: updatedDocument.published === true,
        updated_at: String(updatedDocument.updated_at || "")
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
