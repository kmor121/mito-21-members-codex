import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_CHANNELS = ["email", "line", "email+line"];
const ALLOWED_STATUS = ["draft", "scheduled", "sent", "cancelled", "failed"];
const ALLOWED_AUDIENCE_TYPES = ["all", "member_type", "status", "approval_status"];

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

function normalizeAttachmentsJson(value: unknown) {
  const raw = normalizeString(value);
  return raw || "[]";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const id = normalizeString(body?.id);
    const payload = {
      title: normalizeString(body?.title),
      body: normalizeString(body?.body),
      channel: normalizeString(body?.channel) || "email",
      status: normalizeString(body?.status) || "draft",
      audience_type: normalizeString(body?.audience_type) || "all",
      audience_filter_json: normalizeString(body?.audience_filter_json),
      scheduled_at: normalizeString(body?.scheduled_at),
      last_sent_at: normalizeString(body?.last_sent_at),
      error_message: normalizeString(body?.error_message),
      attachment_info: normalizeString(body?.attachment_info),
      attachments_json: normalizeAttachmentsJson(body?.attachments_json)
    };

    if (!payload.title) {
      return Response.json({ ok: false, error: "title is required" }, { status: 400 });
    }
    if (!payload.body) {
      return Response.json({ ok: false, error: "body is required" }, { status: 400 });
    }
    if (!ALLOWED_CHANNELS.includes(payload.channel)) {
      return Response.json({ ok: false, error: "channel is invalid" }, { status: 400 });
    }
    if (!ALLOWED_STATUS.includes(payload.status)) {
      return Response.json({ ok: false, error: "status is invalid" }, { status: 400 });
    }
    if (!ALLOWED_AUDIENCE_TYPES.includes(payload.audience_type)) {
      return Response.json({ ok: false, error: "audience_type is invalid" }, { status: 400 });
    }
    if (!validateJson(payload.audience_filter_json)) {
      return Response.json({ ok: false, error: "audience_filter_json is invalid" }, { status: 400 });
    }
    if (!validateJson(payload.attachments_json)) {
      return Response.json({ ok: false, error: "attachments_json is invalid" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const newsletter = id
      ? await base44.asServiceRole.entities.Newsletter.update(id, payload)
      : await base44.asServiceRole.entities.Newsletter.create(payload);

    return Response.json({ ok: true, newsletter });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
