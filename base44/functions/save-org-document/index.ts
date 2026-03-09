import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_DOC_TYPES = [
  "事業計画",
  "団体理念",
  "会則・規約",
  "年間スケジュール",
  "運用マニュアル"
];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDocType(value: unknown) {
  const source = normalizeString(value);

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

function normalizeBoolean(value: unknown) {
  return value === true || value === "true";
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
    const docType = normalizeDocType(body?.doc_type);
    const attachment = normalizeString(body?.attachment);
    const categoryInput = normalizeString(body?.category);
    const now = new Date().toISOString();

    if (!ALLOWED_DOC_TYPES.includes(docType)) {
      return Response.json({ ok: false, error: "doc_type is invalid" }, { status: 400 });
    }
    if (attachment) {
      try {
        new URL(attachment);
      } catch {
        return Response.json({ ok: false, error: "attachment is invalid" }, { status: 400 });
      }
    }

    const base44 = createClientFromRequest(req);
    const existingDocument = id
      ? await base44.asServiceRole.entities.OrgDocument.get(id)
      : null;

    if (id && !existingDocument) {
      return Response.json({ ok: false, error: "OrgDocument not found" }, { status: 404 });
    }

    const category =
      docType === "運用マニュアル"
        ? categoryInput || normalizeString(existingDocument?.category) || "運用マニュアル"
        : normalizeString(existingDocument?.category);

    const payload = {
      title: normalizeString(body?.title),
      doc_type: docType,
      fiscal_year_id: normalizeString(body?.fiscal_year_id),
      content: normalizeString(body?.content),
      attachment,
      published: normalizeBoolean(body?.published),
      sort_order: normalizeSortOrder(body?.sort_order),
      category,
      updated_at: now
    };

    if (!payload.title) {
      return Response.json({ ok: false, error: "title is required" }, { status: 400 });
    }

    const document = id
      ? await base44.asServiceRole.entities.OrgDocument.update(id, payload)
      : await base44.asServiceRole.entities.OrgDocument.create(payload);

    return Response.json({
      ok: true,
      document: {
        id: document.id,
        title: String(document.title || ""),
        doc_type: String(document.doc_type || ""),
        fiscal_year_id: String(document.fiscal_year_id || ""),
        content: String(document.content || ""),
        attachment: String(document.attachment || ""),
        category: String(document.category || ""),
        published: document.published === true,
        sort_order: Number(document.sort_order || 0),
        updated_at: String(document.updated_at || "")
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
