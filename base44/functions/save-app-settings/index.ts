import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const updates = body || {};

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates._id;
    delete updates.created_date;

    const base44 = createClientFromRequest(req);
    const list = await base44.asServiceRole.entities.AppSettings.list();

    let result;
    if (list.length > 0) {
      result = await base44.asServiceRole.entities.AppSettings.update(list[0].id, updates);
    } else {
      result = await base44.asServiceRole.entities.AppSettings.create(updates);
    }

    return Response.json({ ok: true, settings: result });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
