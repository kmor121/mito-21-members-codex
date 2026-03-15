import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { member_id, role } = await req.json();

    if (!member_id) {
      return Response.json({ ok: false, error: "member_id is required" }, { status: 400 });
    }
    if (role !== "admin" && role !== "member") {
      return Response.json({ ok: false, error: "role must be admin or member" }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const member = await base44.asServiceRole.entities.Member.get(member_id);

    if (!member) {
      return Response.json({ ok: false, error: "Member not found" }, { status: 404 });
    }

    const updated = await base44.asServiceRole.entities.Member.update(member_id, { role });

    return Response.json({
      ok: true,
      member: {
        id: updated.id,
        name: `${updated.last_name || ""} ${updated.first_name || ""}`.trim(),
        role: String(updated.role || "member")
      }
    });
  } catch (error) {
    console.error(error);
    return Response.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
});
