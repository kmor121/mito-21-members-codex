import { createClientFromRequest } from "npm:@base44/sdk";

function matchesManual(document: Record<string, unknown>) {
  const source = [
    String(document.doc_type || ""),
    String(document.category || ""),
    String(document.title || "")
  ].join(" ");

  return source.includes("運用マニュアル") || source.includes("マニュアル") || source.includes("手順");
}

function toAttachment(attachment: unknown) {
  if (typeof attachment === "string") {
    return {
      url: attachment,
      label: "添付ファイル"
    };
  }

  if (attachment && typeof attachment === "object") {
    const record = attachment as Record<string, unknown>;
    const url = String(record.url || record.download_url || record.src || "");

    if (url) {
      return {
        url,
        label: String(record.name || record.filename || "添付ファイル")
      };
    }
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const base44 = createClientFromRequest(req);
    const documents = await base44.asServiceRole.entities.OrgDocument.list();

    const manuals = documents
      .filter((document) => document.published === true)
      .filter((document) => matchesManual(document))
      .map((document) => ({
        id: document.id,
        title: String(document.title || ""),
        content: String(document.content || ""),
        attachment: toAttachment(document.attachment),
        updated_at: String(document.updated_at || document.updated_date || ""),
        sort_order: Number(document.sort_order || 0)
      }))
      .sort((left, right) => {
        if (left.sort_order !== right.sort_order) {
          return left.sort_order - right.sort_order;
        }
        if (left.updated_at !== right.updated_at) {
          return right.updated_at.localeCompare(left.updated_at);
        }
        return left.title.localeCompare(right.title, "ja");
      });

    return Response.json({
      ok: true,
      manuals
    });
  } catch (error) {
    console.error(error);
    return Response.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
