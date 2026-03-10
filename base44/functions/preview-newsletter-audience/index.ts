import { createClientFromRequest } from "npm:@base44/sdk";

const ALLOWED_AUDIENCE_TYPES = ["all", "member_type", "status", "approval_status", "individual"];
const BASE_APPROVAL_STATUS = "承認済";
const BASE_STATUS = "活動中";

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseFilter(value: unknown): Record<string, unknown> {
  const raw = normalize(value);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new Error("audience_filter_json is invalid");
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();
    const audienceType = normalize(body?.audience_type) || "all";

    if (!ALLOWED_AUDIENCE_TYPES.includes(audienceType)) {
      return Response.json({ ok: false, error: "audience_type is invalid" }, { status: 400 });
    }

    const filter = parseFilter(body?.audience_filter_json);
    const base44 = createClientFromRequest(req);

    // Individual mode: just count member_ids
    if (audienceType === "individual") {
      const memberIds = Array.isArray(filter.member_ids) ? filter.member_ids : [];
      return Response.json({
        ok: true,
        audience_type: audienceType,
        count: memberIds.length,
      });
    }

    const members = await base44.asServiceRole.entities.Member.list();

    // Base filter: approved + active
    let filtered = members.filter((m: Record<string, unknown>) => {
      return normalize(m.approval_status) === BASE_APPROVAL_STATUS
        && normalize(m.status) === BASE_STATUS;
    });

    // Segment filter (new format)
    const segment = normalize(filter.segment);
    if (segment === "正会員" || segment === "賛助会員" || segment === "OB会員" || segment === "名誉顧問") {
      filtered = filtered.filter((m: Record<string, unknown>) => normalize(m.member_type) === segment);
    } else if (segment === "新入会員") {
      filtered = filtered.filter((m: Record<string, unknown>) => m.is_new === true);
    }

    // Legacy member_type filter (backward compat)
    if (!segment && filter.member_type) {
      const mt = normalize(filter.member_type);
      if (mt) {
        filtered = filtered.filter((m: Record<string, unknown>) => normalize(m.member_type) === mt);
      }
    }

    // Compound: is_graduate
    if (filter.is_graduate === true) {
      filtered = filtered.filter((m: Record<string, unknown>) => m.is_graduate === true);
    }

    // Compound: unpaid_only (check dues for current fiscal year)
    if (filter.unpaid_only === true) {
      const dues = await base44.asServiceRole.entities.Due.list();
      const fiscalYears = await base44.asServiceRole.entities.FiscalYear.list();
      const currentFY = fiscalYears.find((fy: Record<string, unknown>) => fy.is_current === true);

      if (currentFY) {
        const paidMemberIds = new Set<string>();
        for (const d of dues) {
          const dr = d as Record<string, unknown>;
          if (normalize(dr.fiscal_year_id) !== String(currentFY.id)) continue;
          if (normalize(dr.status) === "納入済") {
            paidMemberIds.add(normalize(dr.member_id));
          }
        }
        filtered = filtered.filter((m: Record<string, unknown>) => !paidMemberIds.has(String(m.id)));
      }
    }

    // Compound: organization_id
    const orgId = normalize(filter.organization_id);
    if (orgId) {
      const assignments = await base44.asServiceRole.entities.OrgAssignment.list();
      const orgMemberIds = new Set<string>();
      for (const a of assignments) {
        const ar = a as Record<string, unknown>;
        if (normalize(ar.organization_id) === orgId) {
          orgMemberIds.add(normalize(ar.member_id));
        }
      }
      filtered = filtered.filter((m: Record<string, unknown>) => orgMemberIds.has(String(m.id)));
    }

    return Response.json({
      ok: true,
      audience_type: audienceType,
      count: filtered.length,
      segment: segment || "all",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    const status = message === "audience_filter_json is invalid" ? 400 : 500;
    if (status === 500) console.error(error);
    return Response.json({ ok: false, error: message }, { status });
  }
});
