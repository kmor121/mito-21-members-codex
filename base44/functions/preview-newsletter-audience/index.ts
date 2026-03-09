import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_AUDIENCE_TYPES = ["all", "member_type", "status", "approval_status"];
const BASE_APPROVAL_STATUS = "承認済";
const BASE_STATUS = "活動中";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseFilter(value: unknown) {
  const raw = normalizeString(value);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new Error("audience_filter_json is invalid");
  }
}

function normalizeValues(filter: Record<string, unknown>, audienceType: string) {
  const direct = filter[audienceType];
  const genericValue = filter.value;
  const genericValues = filter.values;
  const candidate = direct ?? genericValues ?? genericValue;

  if (Array.isArray(candidate)) {
    return candidate.map((value) => normalizeString(value)).filter(Boolean);
  }

  const single = normalizeString(candidate);
  return single ? [single] : [];
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json(
      { ok: false, error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const body = await req.json();
    const audienceType = normalizeString(body?.audience_type) || "all";

    if (!ALLOWED_AUDIENCE_TYPES.includes(audienceType)) {
      return Response.json(
        { ok: false, error: "audience_type is invalid" },
        { status: 400 }
      );
    }

    const filter = parseFilter(body?.audience_filter_json);
    const values = normalizeValues(filter, audienceType);
    const base44 = createClientFromRequest(req);
    const members = await base44.asServiceRole.entities.Member.list();

    const count = members.filter((member) => {
      const memberApprovalStatus = normalizeString((member as Record<string, unknown>).approval_status);
      const memberStatus = normalizeString((member as Record<string, unknown>).status);

      // Audience preview follows the fixed sendable-member rule.
      if (memberApprovalStatus !== BASE_APPROVAL_STATUS || memberStatus !== BASE_STATUS) {
        return false;
      }

      if (audienceType === "all") {
        return true;
      }

      if (values.length === 0) {
        return false;
      }

      const candidate = normalizeString((member as Record<string, unknown>)[audienceType]);
      return values.includes(candidate);
    }).length;

    return Response.json({
      ok: true,
      audience_type: audienceType,
      count,
      matched_values: values,
      base_rule: {
        approval_status: BASE_APPROVAL_STATUS,
        status: BASE_STATUS
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "audience_filter_json is invalid" ? 400 : 500;
    if (status === 500) {
      console.error(error);
    }
    return Response.json(
      { ok: false, error: message },
      { status }
    );
  }
});
