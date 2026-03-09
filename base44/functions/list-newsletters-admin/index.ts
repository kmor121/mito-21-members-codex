import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const newsletters = await base44.asServiceRole.entities.Newsletter.list();

    const items = newsletters
      .map((newsletter) => ({
        id: newsletter.id,
        title: String(newsletter.title || ""),
        channel: String(newsletter.channel || ""),
        status: String(newsletter.status || ""),
        audience_type: String(newsletter.audience_type || ""),
        scheduled_at: String(newsletter.scheduled_at || ""),
        attachments_json: String(newsletter.attachments_json || "[]"),
        updated_at: String(newsletter.updated_date || newsletter.created_date || ""),
        created_at: String(newsletter.created_date || "")
      }))
      .sort((left, right) => right.updated_at.localeCompare(left.updated_at));

    return Response.json({ ok: true, newsletters: items });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
