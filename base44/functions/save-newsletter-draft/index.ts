import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_CHANNELS = ["email", "line", "email+line"];
const ALLOWED_STATUS = ["draft", "scheduled", "sent", "cancelled", "failed"];
const ALLOWED_AUDIENCE_TYPES = ["all", "member_type", "status", "approval_status", "individual"];

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateJson(value: string) {
  if (!value) {
    return true;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

const PERSIST_THRESHOLD = 2 * 1024 * 1024; // 2MB — keep Base64 for small files

/**
 * Sanitize attachments JSON.
 * - Keep Base64 content for files ≤ 2MB (allows draft persistence)
 * - Strip Base64 for files > 2MB to avoid payload size issues
 * - URL references are kept as-is
 */
function sanitizeAttachmentsJson(value: unknown): string {
  const raw = normalizeString(value);
  if (!raw || raw === "[]") return "[]";

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return "[]";

    const sanitized = parsed.map((att: Record<string, unknown>) => {
      // URL-based attachment — keep as-is
      if (att.url) {
        return { name: att.name || "", url: att.url };
      }
      const size = typeof att.size === "number" ? att.size : 0;
      const entry: Record<string, unknown> = {
        filename: att.filename || att.name || "",
        size,
        type: att.type || "",
      };
      // Persist Base64 content only for small files
      if (att.content && size <= PERSIST_THRESHOLD) {
        entry.content = att.content;
      }
      return entry;
    });

    return JSON.stringify(sanitized);
  } catch {
    return "[]";
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = normalizeString(body?.id);
    const bodyHtml = normalizeString(body?.body_html);
    const bodyText = normalizeString(body?.body);
    const isTemplate = body?.is_template === true || body?.is_template === "true";
    const payload: Record<string, unknown> = {
      title: normalizeString(body?.title),
      body: bodyText || (bodyHtml ? "(リッチテキスト)" : ""),
      body_html: bodyHtml,
      channel: normalizeString(body?.channel) || "email",
      status: normalizeString(body?.status) || "draft",
      audience_type: normalizeString(body?.audience_type) || "all",
      audience_filter_json: normalizeString(body?.audience_filter_json),
      scheduled_at: normalizeString(body?.scheduled_at),
      last_sent_at: normalizeString(body?.last_sent_at),
      error_message: normalizeString(body?.error_message),
      attachment_info: normalizeString(body?.attachment_info),
      attachments_json: sanitizeAttachmentsJson(body?.attachments_json),
      is_template: isTemplate
    };

    if (!payload.title) {
      return Response.json({ ok: false, error: "title is required" }, { status: 400 });
    }
    if (!payload.body && !bodyHtml) {
      return Response.json({ ok: false, error: "body is required" }, { status: 400 });
    }
    if (!ALLOWED_CHANNELS.includes(payload.channel as string)) {
      return Response.json({ ok: false, error: "channel is invalid" }, { status: 400 });
    }
    if (!ALLOWED_STATUS.includes(payload.status as string)) {
      return Response.json({ ok: false, error: "status is invalid" }, { status: 400 });
    }
    if (!ALLOWED_AUDIENCE_TYPES.includes(payload.audience_type as string)) {
      return Response.json({ ok: false, error: "audience_type is invalid" }, { status: 400 });
    }
    if (!validateJson(payload.audience_filter_json as string)) {
      return Response.json({ ok: false, error: "audience_filter_json is invalid" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const newsletter = id
      ? await base44.asServiceRole.entities.Newsletter.update(id, payload)
      : await base44.asServiceRole.entities.Newsletter.create(payload);

    return Response.json({ ok: true, id: newsletter.id, status: newsletter.status, newsletter });
  } catch (error) {
    console.error("save-newsletter-draft error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
});
