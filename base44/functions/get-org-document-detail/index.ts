import { createClientFromRequest } from "npm:@base44/sdk";

function normalizeDocType(value: unknown) {
  const source = String(value || "").trim();

  if (source === "団体理念・活動方針" || source === "活動方針") {
    return "団体理念";
  }
  if (source === "会則" || source === "規約") {
    return "会則・規約";
  }
  if (source === "年間予定" || source === "スケジュール") {
    return "年間スケジュール";
  }
  if (source === "マニュアル" || source === "手順書") {
    return "運用マニュアル";
  }
  return source;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const id = String(url.searchParams.get("id") || "").trim();

    if (!id) {
      return Response.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const document = await base44.asServiceRole.entities.OrgDocument.get(id);

    if (!document) {
      return Response.json({ ok: false, error: "OrgDocument not found" }, { status: 404 });
    }

    return Response.json({
      ok: true,
      document: {
        id: document.id,
        title: String(document.title || ""),
        doc_type: normalizeDocType(document.doc_type),
        fiscal_year_id: String(document.fiscal_year_id || ""),
        content: String(document.content || ""),
        attachment: String(document.attachment || ""),
        category: String(document.category || ""),
        published: document.published === true,
        sort_order: Number(document.sort_order || 0),
        updated_at: String(document.updated_at || document.updated_date || "")
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
