import { createClientFromRequest } from "npm:@base44/sdk";

function normalize(value: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const id = normalize(url.searchParams.get("id"));

    if (!id) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const newsletter = await base44.asServiceRole.entities.Newsletter.get(id);

    if (!newsletter) {
      return Response.json({ ok: false, error: "Newsletter not found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      newsletter: {
        id: newsletter.id,
        title: String(newsletter.title || ""),
        body: String(newsletter.body || ""),
        channel: String(newsletter.channel || "email"),
        status: String(newsletter.status || "draft"),
        audience_type: String(newsletter.audience_type || "all"),
        audience_filter_json: String(newsletter.audience_filter_json || ""),
        scheduled_at: String(newsletter.scheduled_at || ""),
        last_sent_at: String(newsletter.last_sent_at || ""),
        error_message: String(newsletter.error_message || ""),
        attachment_info: String(newsletter.attachment_info || ""),
        attachments_json: String(newsletter.attachments_json || "[]"),
        updated_at: String(newsletter.updated_date || newsletter.created_date || "")
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
