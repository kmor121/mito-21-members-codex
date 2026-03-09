import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "GET") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const memberId = (url.searchParams.get("memberId") || "").trim();

    if (!memberId) {
      return Response.json({ ok: false, error: "memberId is required" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const logs = await base44.asServiceRole.entities.MemberChangeLog.filter(
      { member_id: memberId },
      "-changed_at",
      100
    );

    return Response.json({
      ok: true,
      logs: logs.map((log) => ({
        id: log.id,
        member_id: String(log.member_id || ""),
        changed_by: String(log.changed_by || ""),
        changed_by_role: String(log.changed_by_role || ""),
        changed_at: String(log.changed_at || ""),
        field_name: String(log.field_name || ""),
        old_value: String(log.old_value || ""),
        new_value: String(log.new_value || "")
      }))
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
